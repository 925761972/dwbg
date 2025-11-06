const EMOJI_MAP: Record<string, string> = {
  smile: '😊',
  grin: '😁',
  joy: '😂',
  wink: '😉',
  blush: '☺️',
  heart: '❤️',
  thumbs_up: '👍',
  rocket: '🚀',
  fire: '🔥',
  star: '⭐️',
  tada: '🎉',
  warning: '⚠️',
  check: '✅',
  cross: '❌',
  sparkle: '✨',
  bulb: '💡',
}

export function replaceEmojiShortcodes(input: string): string {
  if (!input) return ''
  return input.replace(/:([a-z0-9_+-]+):/gi, (m, name) => EMOJI_MAP[name] || m)
}

export const EMOJI_LIST: { name: string; char: string }[] = [
  { name: 'smile', char: EMOJI_MAP.smile },
  { name: 'joy', char: EMOJI_MAP.joy },
  { name: 'wink', char: EMOJI_MAP.wink },
  { name: 'rocket', char: EMOJI_MAP.rocket },
  { name: 'tada', char: EMOJI_MAP.tada },
  { name: 'sparkle', char: EMOJI_MAP.sparkle },
  { name: 'bulb', char: EMOJI_MAP.bulb },
  { name: 'thumbs_up', char: EMOJI_MAP.thumbs_up },
  { name: 'fire', char: EMOJI_MAP.fire },
  { name: 'star', char: EMOJI_MAP.star },
  { name: 'heart', char: EMOJI_MAP.heart },
  { name: 'check', char: EMOJI_MAP.check },
  { name: 'warning', char: EMOJI_MAP.warning },
]
