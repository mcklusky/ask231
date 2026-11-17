import type { CSSProperties, HTMLAttributes, ReactElement } from 'react'

export type EmojiIconProps = Omit<HTMLAttributes<HTMLSpanElement>, 'color'> & {
  size?: number | string
  strokeWidth?: number
  color?: string
  fill?: string
}

export type LucideIcon = (props: EmojiIconProps) => ReactElement

function makeIcon(glyph: string): LucideIcon {
  return function SiteIcon({ size = 18, color, fill, style, 'aria-hidden': ariaHidden, ...props }) {
    const iconStyle: CSSProperties = {
      display: 'inline-flex',
      width: '1em',
      height: '1em',
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size,
      lineHeight: 1,
      verticalAlign: '-0.12em',
      color: fill || color,
      ...style,
    }
    return <span {...props} aria-hidden={ariaHidden ?? true} style={iconStyle}>{glyph}</span>
  }
}

export const Anchor = makeIcon('⚓')
export const ArrowLeft = makeIcon('⬅️')
export const ArrowRight = makeIcon('➡️')
export const Baby = makeIcon('🧸')
export const BadgeCheck = makeIcon('✅')
export const Bell = makeIcon('🔔')
export const Bike = makeIcon('🚲')
export const BriefcaseBusiness = makeIcon('💼')
export const Building2 = makeIcon('🏢')
export const BusFront = makeIcon('🚌')
export const Camera = makeIcon('📷')
export const CarFront = makeIcon('🚙')
export const Check = makeIcon('✔️')
export const ChevronLeft = makeIcon('‹')
export const ChevronRight = makeIcon('›')
export const ClipboardList = makeIcon('📋')
export const Construction = makeIcon('🏗️')
export const Dumbbell = makeIcon('🏋️')
export const Eye = makeIcon('👁️')
export const EyeOff = makeIcon('🙈')
export const Factory = makeIcon('🏭')
export const FileText = makeIcon('📄')
export const Flag = makeIcon('🚩')
export const Hammer = makeIcon('🔨')
export const Headphones = makeIcon('🎧')
export const Heart = makeIcon('❤️')
export const HeartPulse = makeIcon('⚕️')
export const ImagePlus = makeIcon('🖼️')
export const Laptop = makeIcon('💻')
export const LayoutDashboard = makeIcon('📊')
export const List = makeIcon('📃')
export const LogOut = makeIcon('🚪')
export const Mail = makeIcon('✉️')
export const MapPin = makeIcon('📍')
export const Megaphone = makeIcon('📣')
export const MessageCircle = makeIcon('💬')
export const Moon = makeIcon('🌙')
export const Package = makeIcon('📦')
export const PawPrint = makeIcon('🐾')
export const Pencil = makeIcon('✏️')
export const Phone = makeIcon('📞')
export const Plug = makeIcon('🔌')
export const Plus = makeIcon('➕')
export const Search = makeIcon('🔍')
export const Settings2 = makeIcon('⚙️')
export const ShieldAlert = makeIcon('🚨')
export const ShieldCheck = makeIcon('🛡️')
export const Shirt = makeIcon('👕')
export const SlidersHorizontal = makeIcon('🎚️')
export const Smartphone = makeIcon('📱')
export const Sofa = makeIcon('🛋️')
export const Sparkles = makeIcon('✨')
export const Sprout = makeIcon('🌱')
export const Store = makeIcon('🏪')
export const Sun = makeIcon('☀️')
export const Tablet = makeIcon('📲')
export const Tag = makeIcon('🏷️')
export const Trash2 = makeIcon('🗑️')
export const Truck = makeIcon('🚚')
export const UserRound = makeIcon('👤')
export const Users = makeIcon('👥')
export const Watch = makeIcon('⌚')
export const Wrench = makeIcon('🔧')
export const X = makeIcon('✖️')
export const Send = makeIcon('📨')
