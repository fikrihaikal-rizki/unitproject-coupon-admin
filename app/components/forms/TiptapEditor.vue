<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, ListOrdered, Quote, Redo, Undo } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[150px] max-w-none',
    },
  },
})

watch(() => props.modelValue, (value) => {
  const isSame = editor.value?.getHTML() === value
  if (isSame) return
  editor.value?.commands.setContent(value)
})
</script>

<template>
  <div v-if="editor" class="rounded-md border bg-white overflow-hidden">
    <div class="flex flex-wrap items-center gap-1 border-b bg-slate-50 p-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'bg-slate-200': editor.isActive('bold') }"
      >
        <Bold class="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'bg-slate-200': editor.isActive('italic') }"
      >
        <Italic class="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'bg-slate-200': editor.isActive('bulletList') }"
      >
        <List class="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'bg-slate-200': editor.isActive('orderedList') }"
      >
        <ListOrdered class="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        @click="editor.chain().focus().toggleBlockquote().run()"
        :class="{ 'bg-slate-200': editor.isActive('blockquote') }"
      >
        <Quote class="h-4 w-4" />
      </Button>
      <div class="mx-1 h-6 w-px bg-slate-200" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        @click="editor.chain().focus().undo().run()"
      >
        <Undo class="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        @click="editor.chain().focus().redo().run()"
      >
        <Redo class="h-4 w-4" />
      </Button>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>

<style>
.tiptap p.is-editor-empty:first-child::before {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
