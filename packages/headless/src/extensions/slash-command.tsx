import { Extension } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionOptions, type SuggestionProps } from "@tiptap/suggestion";
import type { RefObject } from "react";
import type { ReactNode } from "react";
import { computePosition, flip, shift, offset } from "@floating-ui/dom";
import { EditorCommandOut } from "../components/editor-command";

const Command = Extension.create({
  name: "slash-command",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
      } as SuggestionOptions,
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

const renderItems = (elementRef?: RefObject<Element> | null) => {
  let component: ReactRenderer | null = null;
  let popup: HTMLElement | null = null;

  return {
    onStart: (props: SuggestionProps) => {
      component = new ReactRenderer(EditorCommandOut, {
        props,
        editor: props.editor,
      });

      const { selection } = props.editor.state;

      const parentNode = selection.$from.node(selection.$from.depth);
      const blockType = parentNode.type.name;

      if (blockType === "codeBlock") {
        return false;
      }

      popup = document.createElement("div");
      popup.style.zIndex = "999";
      popup.style.position = "absolute";
      popup.style.left = "0";
      popup.style.top = "0";
      popup.appendChild(component.element);
      (elementRef ? elementRef.current : document.body)?.appendChild(popup);

      const { clientRect } = props;
      if (clientRect && popup) {
        computePosition(
          {
            getBoundingClientRect:
              typeof clientRect === "function" ? (clientRect as () => DOMRect) : () => clientRect as DOMRect,
          },
          popup,
          {
            placement: "bottom-start",
            middleware: [offset(5), flip(), shift()],
          },
        ).then(({ x, y }) => {
          if (popup) {
            Object.assign(popup.style, {
              left: `${x}px`,
              top: `${y}px`,
            });
          }
        });
      }
    },
    onUpdate: (props: SuggestionProps) => {
      component?.updateProps(props);

      const { clientRect } = props;
      if (clientRect && popup) {
        computePosition(
          {
            getBoundingClientRect:
              typeof clientRect === "function" ? (clientRect as () => DOMRect) : () => clientRect as DOMRect,
          },
          popup,
          {
            placement: "bottom-start",
            middleware: [offset(5), flip(), shift()],
          },
        ).then(({ x, y }) => {
          if (popup) {
            Object.assign(popup.style, {
              left: `${x}px`,
              top: `${y}px`,
            });
          }
        });
      }
    },

    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "Escape") {
        popup?.remove();
        return true;
      }

      // @ts-ignore
      return component?.ref?.onKeyDown(props);
    },
    onExit: () => {
      popup?.remove();
      component?.destroy();
    },
  };
};

export interface SuggestionItem {
  title: string;
  description: string;
  icon: ReactNode;
  searchTerms?: string[];
  command?: (props: { editor: Editor; range: Range }) => void;
}

export const createSuggestionItems = (items: SuggestionItem[]) => items;

export const handleCommandNavigation = (event: KeyboardEvent) => {
  if (["ArrowUp", "ArrowDown", "Enter"].includes(event.key)) {
    const slashCommand = document.querySelector("#slash-command");
    if (slashCommand) {
      return true;
    }
  }
};

export { Command, renderItems };
