import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { Plugin } from '@tiptap/pm/state'
import ImageGroupNodeView from './ImageGroupNodeView.vue'
import { UploadedFile } from '../../../../utils/useFileUpload'

export interface ImageGroupOptions {
  /**
   * Function to handle image uploads
   * @default null
   */
  uploadFunction: ((file: File) => Promise<UploadedFile>) | null
  HTMLAttributes: Record<string, any>
  /**
   * When true, listens for drag-and-drop events on the entire page and
   * inserts dropped images into this editor, even when the drop target is
   * outside the editor container.
   */
  interceptPageDrops: boolean
  /**
   * Called when one or more image files need to be uploaded as a group.
   * The host component (e.g. TextEditor) should open the upload dialog.
   */
  onUploadImages?: (files: File[]) => void
}

export interface ImageGroupAttrs {
  columns?: number
  images: {
    src: string
    alt?: string
  }[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageGroup: {
      /**
       * Insert an image group/gallery node
       */
      setImageGroup: (attrs: {
        columns?: number
        images: { src: string; alt?: string }[]
      }) => ReturnType
      /**
       * Group selected images into an image group
       */
      groupSelectedImages: () => ReturnType
      /**
       * Upload one or more image files. A single file is inserted as a plain
       * image; two or more files are inserted as an image group.
       */
      uploadImages: (files: File[]) => ReturnType
    }
  }
}

export const ImageGroup = Node.create<ImageGroupOptions>({
  name: 'imageGroup',

  // Higher priority than ImageExtension (100) so this plugin's drop handler
  // runs first and can intercept multi-image drops before ImageExtension does.
  priority: 110,

  group: 'block',
  content: 'image+', // one or more images
  selectable: true,
  draggable: true,
  isolating: true,

  addStorage() {
    return {
      _pageDragOverHandler: null as ((e: DragEvent) => void) | null,
      _pageDropHandler: null as ((e: DragEvent) => void) | null,
    }
  },

  addOptions() {
    return {
      uploadFunction: null,
      HTMLAttributes: {},
      interceptPageDrops: false,
      onUploadImages: undefined,
    }
  },

  onCreate() {
    if (!this.options.interceptPageDrops) return

    this.storage._pageDragOverHandler = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return
      event.preventDefault()
    }

    this.storage._pageDropHandler = (event: DragEvent) => {
      const view = this.editor?.view
      if (!view) return

      const files = Array.from(event.dataTransfer?.files || [])
      const images = files.filter((f) => f.type.startsWith('image/'))
      if (images.length === 0) return

      // If dropped inside the editor, let TipTap's own handler deal with it
      if (view.dom.contains(event.target as HTMLElement)) return

      event.preventDefault()
      this.editor.commands.uploadImages(images)
    }

    document.addEventListener('dragover', this.storage._pageDragOverHandler)
    document.addEventListener('drop', this.storage._pageDropHandler)
  },

  onDestroy() {
    if (this.storage._pageDragOverHandler) {
      document.removeEventListener(
        'dragover',
        this.storage._pageDragOverHandler,
      )
      this.storage._pageDragOverHandler = null
    }
    if (this.storage._pageDropHandler) {
      document.removeEventListener('drop', this.storage._pageDropHandler)
      this.storage._pageDropHandler = null
    }
  },

  addAttributes() {
    return {
      columns: {
        default: 4,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="image-group"]',
        getAttrs: (element) => {
          if (typeof element === 'string') return {}
          const el = element as HTMLElement
          return {
            columns: el.getAttribute('data-columns')
              ? Number(el.getAttribute('data-columns'))
              : 4,
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'image-group',
          'data-columns': node.attrs.columns,
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      0, // content placeholder for child images
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageGroupNodeView)
  },

  addCommands() {
    return {
      setImageGroup:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              columns: attrs.columns || 4,
            },
            content: attrs.images.map((img) => ({
              type: 'image',
              attrs: img,
            })),
          })
        },

      groupSelectedImages:
        () =>
        ({ state, chain }) => {
          const { selection } = state
          const { from, to } = selection

          // Collect all image nodes within the selection
          const images: { src: string; alt?: string; pos: number }[] = []

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === 'image') {
              images.push({
                src: node.attrs.src,
                alt: node.attrs.alt,
                pos,
              })
            }
          })

          // Need at least 2 images to create a group
          if (images.length < 2) {
            return false
          }

          // Sort by position (descending) for deletion
          const sortedImages = [...images].sort((a, b) => b.pos - a.pos)

          // Find the position to insert the group (start of selection)
          const insertPos = Math.min(...images.map((img) => img.pos))

          // Start a chain of commands
          let cmd = chain()

          // Delete all selected images (from end to start to maintain positions)
          sortedImages.forEach((img) => {
            const node = state.doc.nodeAt(img.pos)
            if (node) {
              cmd = cmd.deleteRange({
                from: img.pos,
                to: img.pos + node.nodeSize,
              })
            }
          })

          // Insert the image group at the start position and run the chain
          cmd
            .insertContentAt(insertPos, {
              type: this.name,
              attrs: { columns: images.length },
              content: images.map((img) => ({
                type: 'image',
                attrs: { src: img.src, alt: img.alt },
              })),
            })
            .run()

          return true
        },

      uploadImages:
        (files: File[]) =>
        ({ editor }) => {
          if (files.length < 2) {
            return editor.commands.uploadImage(files[0])
          }
          this.options.onUploadImages?.(files)
          return true
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-g': () => this.editor.commands.groupSelectedImages(),
    }
  },

  addProseMirrorPlugins() {
    const extensionThis = this
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            drop: (view, event) => {
              if (!extensionThis.options.uploadFunction) return false

              const images = Array.from(event.dataTransfer?.files || []).filter(
                (f) => /image/i.test(f.type),
              )

              // Single-image drops are handled by ImageExtension
              if (images.length < 2) return false

              event.preventDefault()
              extensionThis.options.onUploadImages?.(images)
              return true
            },
          },
        },
      }),
    ]
  },
})

export default ImageGroup
