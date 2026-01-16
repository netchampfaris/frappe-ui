import { Node, mergeAttributes } from '@tiptap/core'

/**
 * An extension that adds an empty <div> to store metadata, specifically
 * the schema-version of the document.
 */
export const DocumentMetadata = Node.create({
  name: 'documentMetadata',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      'schema-version': {
        default: '3',
        parseHTML: (element) => element.getAttribute('schema-version'),
        renderHTML: (attributes) => {
          return {
            'schema-version': attributes['schema-version'],
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[schema-version]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)]
  },

  addCommands() {
    return {
      setMetadata:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          })
        },
    }
  },
})
