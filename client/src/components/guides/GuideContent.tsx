/**
 * Renders guide content with [text](url) links and **bold** converted to React nodes
 */

import { ReactNode } from "react";

const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const BOLD_REGEX = /\*\*([^*]+)\*\*/g;

function processBold(str: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(BOLD_REGEX.source, "g");
  while ((match = re.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.slice(lastIndex, match.index));
    }
    parts.push(<strong key={`${keyPrefix}-${match.index}`} className="font-semibold text-white">{match[1]}</strong>);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < str.length) {
    parts.push(str.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [str];
}

export function renderGuideText(text: string, keyPrefix = "g"): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(LINK_REGEX.source, "g");
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      parts.push(...processBold(plain, `${keyPrefix}-${lastIndex}`));
    }
    parts.push(
      <a
        key={`${keyPrefix}-link-${match.index}`}
        href={match[2]}
        className="text-[#c0c0c0] hover:text-white underline"
      >
        {match[1]}
      </a>
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    const plain = text.slice(lastIndex);
    parts.push(...processBold(plain, `${keyPrefix}-${lastIndex}`));
  }
  return parts.length > 0 ? parts : [text];
}
