<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { marked } from 'marked'
import IconButton from './IconButton.vue'
import spellCheckIcon from '../assets/spell-check.svg'

// ── Markdown renderer ─────────────────────────────────────────────────────────
const mdRenderer = new marked.Renderer()
;(mdRenderer as any).link = (...args: any[]) => {
  let href: string | null = null
  let title: string | null = null
  let text = ''
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    href = args[0].href ?? null
    title = args[0].title ?? null
    text = args[0].text ?? ''
  } else {
    href = args[0] ?? null
    title = args[1] ?? null
    text = args[2] ?? ''
  }
  const safeHref = href || ''
  const titleAttr = title ? ` title="${title}"` : ''
  return `<a href="${safeHref}"${titleAttr} target="_blank" rel="noreferrer noopener">${text}</a>`
}

// ── Props / emits ─────────────────────────────────────────────────────────────
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const noteContent = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// ── Editing state ─────────────────────────────────────────────────────────────
const isEditing = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const startEditing = () => {
  isEditing.value = true
  nextTick(() => textareaRef.value?.focus())
}

const stopEditing = () => {
  isEditing.value = false
}

// ── LanguageTool spell-check ──────────────────────────────────────────────────
const LT_URL = 'https://api.languagetool.org/v2/check'
const MIN_INTERVAL_MS = 4000 // 15 req/min → 1 every 4 s

interface LTReplacement {
  value: string
}
interface LTMatch {
  message: string
  offset: number
  length: number
  replacements: LTReplacement[]
  rule: { issueType: string; description: string }
}

const spellErrors = ref<LTMatch[]>([])
const selectedError = ref<(LTMatch & { elementIdx: number }) | null>(null)
const popupPos = ref({ x: 0, y: 0 })
const ltLastCheck = ref(0)
const ltTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const ignoredWords = ref<Set<string>>(new Set())

// Replaces markdown syntax chars with spaces of the same length so LT offsets stay valid.
// noteContent (original) is never modified — renderedContent always uses it as-is.
const stripMarkdownForLT = (text: string): string => {
  return text
    .replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length)) // fenced code
    .replace(/`[^`\n]+`/g, (m) => ' '.repeat(m.length)) // inline code
    .replace(/^#{1,6} /gm, (m) => ' '.repeat(m.length)) // headings
    .replace(/^> ?/gm, (m) => ' '.repeat(m.length)) // blockquotes
    .replace(/!\[[^\]]*\]\([^)]*\)/g, (m) => ' '.repeat(m.length)) // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, (m, t) => ' ' + t + ' '.repeat(m.length - t.length - 1)) // links
    .replace(/\*\*(.+?)\*\*/gs, (m, t) => '  ' + t + '  ') // bold **
    .replace(/__(.+?)__/gs, (m, t) => '  ' + t + '  ') // bold __
    .replace(/~~(.+?)~~/gs, (m, t) => '  ' + t + '  ') // strikethrough
    .replace(/(?<!\*)\*(?!\*)/g, ' ') // italic *
    .replace(/(?<![a-zA-Z0-9])_(.+?)_(?![a-zA-Z0-9])/gs, (m, t) => ' ' + t + ' ') // italic _
}

const doCheckSpelling = async () => {
  if (!noteContent.value) {
    spellErrors.value = []
    return
  }
  ltLastCheck.value = Date.now()
  try {
    const stripped = stripMarkdownForLT(noteContent.value)
    const body = new URLSearchParams({ text: stripped, language: 'auto' })
    const res = await fetch(LT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await res.json()
    spellErrors.value = ((data.matches as LTMatch[]) || []).filter((match) => {
      const word = noteContent.value.substring(match.offset, match.offset + match.length)
      return !ignoredWords.value.has(word.toLowerCase())
    })
  } catch (e) {
    console.error('[LanguageTool]', e)
  }
}

const scheduleSpellCheck = () => {
  if (ltTimer.value) clearTimeout(ltTimer.value)
  const elapsed = Date.now() - ltLastCheck.value
  const delay = Math.max(0, MIN_INTERVAL_MS - elapsed)
  ltTimer.value = setTimeout(doCheckSpelling, delay)
}

const clearErrors = () => {
  spellErrors.value = []
  selectedError.value = null
  if (noteContent.value) scheduleSpellCheck()
}

const ignoreWord = () => {
  if (!selectedError.value) return
  const word = noteContent.value
    .substring(selectedError.value.offset, selectedError.value.offset + selectedError.value.length)
    .toLowerCase()
  ignoredWords.value.add(word)
  spellErrors.value = spellErrors.value.filter(
    (e) => noteContent.value.substring(e.offset, e.offset + e.length).toLowerCase() !== word,
  )
  selectedError.value = null
}

const applyCorrection = (replacement: string) => {
  if (!selectedError.value) return
  const { offset, length } = selectedError.value
  noteContent.value =
    noteContent.value.substring(0, offset) +
    replacement +
    noteContent.value.substring(offset + length)
  selectedError.value = null
  scheduleSpellCheck()
}

const applyAllCorrections = () => {
  const sorted = [...spellErrors.value]
    .filter((e) => e.replacements.length > 0)
    .sort((a, b) => b.offset - a.offset)
  let text = noteContent.value
  for (const err of sorted) {
    text =
      text.substring(0, err.offset) +
      err.replacements[0]!.value +
      text.substring(err.offset + err.length)
  }
  noteContent.value = text
  selectedError.value = null
  scheduleSpellCheck()
}

const handlePreviewClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  const mark = target.closest('[data-lt-idx]') as HTMLElement | null
  if (mark) {
    event.stopPropagation()
    const idx = parseInt(mark.getAttribute('data-lt-idx') ?? '-1')
    if (idx >= 0 && spellErrors.value[idx]) {
      selectedError.value = { ...spellErrors.value[idx], elementIdx: idx }
      const rect = mark.getBoundingClientRect()
      popupPos.value = { x: rect.left, y: rect.bottom + 6 }
    }
  } else if (!target.closest('.lt-popup')) {
    selectedError.value = null
    startEditing()
  }
}

const closePopupOnOutside = (e: MouseEvent) => {
  const t = e.target as HTMLElement
  if (!t.closest('.lt-popup') && !t.closest('[data-lt-idx]')) {
    selectedError.value = null
  }
}

// ── Rendered markdown with error highlights ───────────────────────────────────
const renderedContent = computed(() => {
  if (!noteContent.value) return ''

  // Step 1: render original markdown — never touched by mark injection
  const html = marked.parse(noteContent.value, { renderer: mdRenderer }) as string

  if (!spellErrors.value.length) return html

  // Step 2: for each LT error, determine which *occurrence* of that word it is in the source.
  // e.g. if "per" appears at offsets [10, 40, 80] and LT flags offset 40, that's occurrence #1 (0-based).
  // This lets us mark exactly the right one in the rendered HTML.
  const makePattern = (word: string) => {
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const lb = /^\w/.test(word) ? '\\b' : ''
    const rb = /\w$/.test(word) ? '\\b' : ''
    return lb + esc + rb
  }

  type ErrorTarget = { word: string; nthOccurrence: number; idx: number }
  const errorTargets: ErrorTarget[] = spellErrors.value.map((e, idx) => {
    const word = noteContent.value.substring(e.offset, e.offset + e.length)
    const before = noteContent.value.substring(0, e.offset)
    const nthOccurrence = (before.match(new RegExp(makePattern(word), 'g')) || []).length
    return { word, nthOccurrence, idx }
  })

  // Map "word::nth" → error index for fast lookup
  const markMap = new Map<string, number>()
  for (const t of errorTargets) {
    markMap.set(`${t.word}::${t.nthOccurrence}`, t.idx)
  }

  // Global occurrence counters shared across all text-node segments of the HTML
  const seenCounts = new Map<string, number>()
  const uniqueWords = new Set(errorTargets.map((t) => t.word))

  // Step 3: walk HTML text-node segments, count occurrences, mark only the right ones
  type Hit = { start: number; end: number; errorIdx: number; word: string }

  return html.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text: string) => {
    if (tag) return tag
    if (!text) return match

    // Collect all matches of any error word in this text segment (in source order)
    type RawHit = { start: number; end: number; word: string }
    const rawHits: RawHit[] = []
    for (const word of uniqueWords) {
      const re = new RegExp(makePattern(word), 'g')
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        rawHits.push({ start: m.index, end: m.index + m[0].length, word })
      }
    }
    rawHits.sort((a, b) => a.start - b.start)

    // Walk matches in order: track occurrence count, keep only targeted ones
    const hits: Hit[] = []
    let lastEnd = -1
    for (const rh of rawHits) {
      if (rh.start < lastEnd) continue // skip overlapping
      const count = seenCounts.get(rh.word) ?? 0
      seenCounts.set(rh.word, count + 1)
      const key = `${rh.word}::${count}`
      if (markMap.has(key)) {
        hits.push({ start: rh.start, end: rh.end, word: rh.word, errorIdx: markMap.get(key)! })
        lastEnd = rh.end
      }
    }

    if (!hits.length) return text

    // Rebuild text node with <mark> injected only at the correct positions
    let result = ''
    let pos = 0
    for (const h of hits) {
      result += text.slice(pos, h.start)
      result += `<mark class="lt-error" data-lt-idx="${h.errorIdx}">${h.word}</mark>`
      pos = h.end
    }
    result += text.slice(pos)
    return result
  })
})

// ── Keyboard helpers ──────────────────────────────────────────────────────────
const handleTab = (event: KeyboardEvent) => {
  event.preventDefault()
  const textarea = textareaRef.value
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const spaces = '    '
  noteContent.value =
    noteContent.value.substring(0, start) + spaces + noteContent.value.substring(end)
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + spaces.length
  })
}

const wrapText = (prefix: string, suffix: string) => {
  const textarea = textareaRef.value
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = noteContent.value.substring(start, end)
  noteContent.value =
    noteContent.value.substring(0, start) +
    prefix +
    selectedText +
    suffix +
    noteContent.value.substring(end)
  nextTick(() => {
    textarea.selectionStart = start + prefix.length
    textarea.selectionEnd = end + prefix.length
    textarea.focus()
  })
}

const handleBold = (e: KeyboardEvent) => {
  e.preventDefault()
  wrapText('**', '**')
}
const handleItalic = (e: KeyboardEvent) => {
  e.preventDefault()
  wrapText('_', '_')
}
const handleUnderline = (e: KeyboardEvent) => {
  e.preventDefault()
  wrapText('<u>', '</u>')
}

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(noteContent, () => scheduleSpellCheck())

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  if (noteContent.value) scheduleSpellCheck()
  document.addEventListener('click', closePopupOnOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closePopupOnOutside)
  if (ltTimer.value) clearTimeout(ltTimer.value)
})

defineExpose({ startEditing, stopEditing, clearErrors })
</script>

<template>
  <div
    class="self-stretch flex-1 flex flex-col items-start text-left text-[1.5rem] text-gray-500 min-h-0"
  >
    <!-- Preview / Textarea wrapper with floating button -->
    <div class="relative self-stretch flex-1 min-h-0 flex flex-col">
      <div
        v-if="!isEditing"
        @click="handlePreviewClick"
        class="self-stretch grow h-0 rounded-[10px] border-gainsboro-100 border-solid border-[1px] py-[0.937rem] px-[1.25rem] text-gray-500 text-[1rem] font-inter leading-normal cursor-pointer hover:bg-gray-50 transition-colors overflow-y-auto markdown-content"
        :class="{ 'text-gray-400 italic': !noteContent }"
      >
        <div v-if="noteContent" v-html="renderedContent"></div>
        <div v-else @click="startEditing">Click to start editing...</div>
      </div>
      <textarea
        v-else
        v-model="noteContent"
        @blur="stopEditing"
        @keydown.tab="handleTab"
        @keydown.ctrl.b="handleBold"
        @keydown.ctrl.i="handleItalic"
        @keydown.ctrl.u="handleUnderline"
        class="self-stretch w-full grow h-0 rounded-[10px] border-gainsboro-100 border-solid border-[1px] py-[0.937rem] px-[1.25rem] resize-none focus:outline-none text-gray-500 text-[1rem] font-inter leading-normal"
        placeholder="Write your notes here..."
        ref="textareaRef"
      ></textarea>

      <!-- Floating fix-all button -->
      <div class="absolute bottom-3 right-4 z-10">
        <IconButton
          :icon="spellCheckIcon"
          alt="Fix all spelling errors"
          background="bg-transparent"
          :disabled="spellErrors.filter((e) => e.replacements.length).length === 0"
          title="Apply all suggestions automatically"
          :onClick="applyAllCorrections"
        />
      </div>
    </div>
  </div>

  <!-- LanguageTool suggestions popup -->
  <Teleport to="body">
    <div
      v-if="selectedError"
      class="lt-popup"
      :style="{ left: popupPos.x + 'px', top: popupPos.y + 'px' }"
    >
      <p class="lt-popup-msg">{{ selectedError.message }}</p>
      <div class="lt-popup-actions">
        <button
          v-if="selectedError.replacements.length"
          class="lt-btn lt-btn-primary"
          @click="applyCorrection(selectedError.replacements[0]!.value)"
        >
          → {{ selectedError.replacements[0]!.value }}
        </button>
        <button
          v-for="r in selectedError.replacements.slice(1, 5)"
          :key="r.value"
          class="lt-btn"
          @click="applyCorrection(r.value)"
        >
          {{ r.value }}
        </button>
        <span v-if="!selectedError.replacements.length" class="lt-no-suggestions"
          >No suggestions</span
        >
        <button class="lt-btn lt-btn-ignore" @click="ignoreWord">Ignore</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.markdown-content :deep(h1) {
  font-size: 2em;
  font-weight: 700;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  color: #1a1a1a;
}
.markdown-content :deep(h2) {
  font-size: 1.5em;
  font-weight: 700;
  margin-top: 0.5em;
  margin-bottom: 0.4em;
  color: #1a1a1a;
}
.markdown-content :deep(h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 0.5em;
  margin-bottom: 0.3em;
  color: #2a2a2a;
}
.markdown-content :deep(h4) {
  font-size: 1.1em;
  font-weight: 600;
  margin-top: 0.4em;
  margin-bottom: 0.3em;
  color: #2a2a2a;
}
.markdown-content :deep(p) {
  margin-bottom: 0.75em;
  line-height: 1.6;
}
.markdown-content :deep(strong) {
  font-weight: 700;
  color: #1a1a1a;
}
.markdown-content :deep(em) {
  font-style: italic;
}
.markdown-content :deep(u) {
  text-decoration: underline;
}
.markdown-content :deep(ul) {
  list-style-type: disc;
  margin-left: 1.5em;
  margin-bottom: 0.75em;
}
.markdown-content :deep(ul ul) {
  list-style-type: circle;
  margin-top: 0.25em;
  margin-bottom: 0.25em;
}
.markdown-content :deep(ul ul ul) {
  list-style-type: square;
}
.markdown-content :deep(ol) {
  list-style-type: decimal;
  margin-left: 1.5em;
  margin-bottom: 0.75em;
}
.markdown-content :deep(ol ol) {
  list-style-type: lower-alpha;
  margin-top: 0.25em;
  margin-bottom: 0.25em;
}
.markdown-content :deep(ol ol ol) {
  list-style-type: lower-roman;
}
.markdown-content :deep(li) {
  margin-bottom: 0.25em;
  line-height: 1.6;
}
.markdown-content :deep(li > ul),
.markdown-content :deep(li > ol) {
  margin-top: 0.25em;
}
.markdown-content :deep(code) {
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  color: #d63384;
}
.markdown-content :deep(pre) {
  background-color: #f3f4f6;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
  margin-bottom: 0.75em;
}
.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: #1a1a1a;
}
.markdown-content :deep(blockquote) {
  border-left: 4px solid #4766d4;
  padding-left: 1em;
  margin-left: 0;
  margin-bottom: 0.75em;
  color: #4a5568;
  font-style: italic;
}
.markdown-content :deep(a) {
  color: #4766d4;
  text-decoration: underline;
}
.markdown-content :deep(a:hover) {
  color: #25356e;
}
.markdown-content :deep(hr) {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 1em 0;
}
.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 0.75em;
}
.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 0.5em;
  text-align: left;
}
.markdown-content :deep(th) {
  background-color: #f3f4f6;
  font-weight: 600;
}
.markdown-content :deep(mark.lt-error) {
  background-color: transparent;
  color: inherit;
  text-decoration: underline wavy #e53e3e;
  text-decoration-skip-ink: none;
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.15s;
}
.markdown-content :deep(mark.lt-error:hover) {
  background-color: #fff5f5;
}
</style>

<style>
.lt-popup {
  position: fixed;
  z-index: 9999;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 0.625rem 0.75rem;
  min-width: 180px;
  max-width: 320px;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
}
.lt-popup-msg {
  margin: 0 0 0.5rem 0;
  color: #4a5568;
  font-size: 0.8rem;
  line-height: 1.4;
}
.lt-popup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
.lt-btn {
  padding: 0.25rem 0.625rem;
  border-radius: 5px;
  border: 1px solid #cbd5e0;
  background: #f7fafc;
  color: #2d3748;
  font-size: 0.85rem;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.lt-btn:hover {
  background: #edf2f7;
  border-color: #a0aec0;
}
.lt-btn-primary {
  background: #4766d4;
  border-color: #4766d4;
  color: #ffffff;
  font-weight: 600;
}
.lt-btn-primary:hover {
  background: #3655b8;
  border-color: #3655b8;
}
.lt-no-suggestions {
  color: #a0aec0;
  font-size: 0.8rem;
  align-self: center;
}
.lt-btn-ignore {
  margin-left: auto;
  background: transparent;
  border: 1px solid #e2e8f0;
  color: #a0aec0;
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
}
</style>
