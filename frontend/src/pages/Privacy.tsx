import { Link } from 'react-router-dom'
import LegalPage, { type LegalSection } from '@/components/LegalPage'
import { LEGAL } from '@/lib/legal'

const sections: LegalSection[] = [
  { id: 'collect', title: 'What we collect', body: <>
    <p><strong>When you create an account:</strong> your name, email address, password (stored only in scrambled, “hashed” form that we cannot read), phone number, and optionally your county, town, preferred currency and business name.</p>
    <p><strong>When you post an advertisement:</strong> its title, description, price, condition, category, location, phone and WhatsApp numbers, and photos.</p>
    <p><strong>When you use MarketDay:</strong> the messages and offers you send, listings you save, reports you submit, and requests for seller verification.</p>
    <p><strong>Automatically:</strong> basic technical information such as your IP address, browser type and the pages you request, which our servers record to keep the service secure and working. We also count how many times each listing is viewed.</p>
  </> },
  { id: 'photos', title: 'Photos', body: <>
    <p>Photos taken on phones often contain hidden information, such as the exact location where the photo was taken. <strong>We remove this information when you upload a photo.</strong> We also resize photos and make smaller copies so pages load faster on mobile data.</p>
  </> },
  { id: 'use', title: 'How we use your information', body: <>
    <ul>
      <li>to run your account and show your advertisements;</li>
      <li>to let buyers and sellers contact each other;</li>
      <li>to send account emails, such as email confirmation and password reset links;</li>
      <li>to review advertisements, investigate reports, and prevent scams, spam and abuse;</li>
      <li>to keep MarketDay secure, fix problems and understand how it is used.</li>
    </ul>
    <p>We do not sell your personal information, and we do not use it for third-party advertising.</p>
  </> },
  { id: 'public', title: 'What other people can see', body: <>
    <p>When you post an advertisement, anyone can see it, including: your name or business name, whether you are a verified seller, the phone and WhatsApp numbers you add to the ad, and the town and county (or city and country) you choose. <strong>Only include contact details you are happy to share publicly.</strong></p>
    <p>Your email address is never shown on listings.</p>
  </> },
  { id: 'messages', title: 'Messages', body: <>
    <p>Messages and offers are private between the buyer and the seller of that listing. Our staff do not read conversations routinely; they may review a conversation when it is reported, to investigate scams or abuse, or where the law requires it.</p>
  </> },
  { id: 'sharing', title: 'Who we share information with', body: <>
    <ul>
      <li><strong>Service providers</strong> who run parts of MarketDay for us, such as cloud hosting, file storage and email delivery. They may only use the information to provide their service to us.</li>
      <li><strong>Google Fonts</strong>, which supplies the typefaces on our pages and receives your IP address when a page loads.</li>
      <li><strong>Authorities</strong>, when we must by law, or to protect people from fraud or harm.</li>
      <li><strong>A new owner</strong>, if MarketDay is ever sold or reorganised, under the same protections.</li>
    </ul>
    <p>Our service providers may store information on servers outside Liberia. We choose providers that protect it appropriately.</p>
  </> },
  { id: 'browser', title: 'Information stored in your browser', body: <>
    <p>To keep you signed in, MarketDay stores sign-in tokens in your browser’s local storage. It also remembers whether you prefer light or dark mode. We do not use advertising or tracking cookies. Signing out removes your sign-in tokens.</p>
  </> },
  { id: 'security', title: 'Keeping information safe', body: <>
    <p>We use encrypted connections (HTTPS), store passwords only in hashed form, limit repeated sign-in and reporting attempts, and restrict staff access to what they need. No online service can be completely secure, so please use a strong, unique password and never share verification codes.</p>
  </> },
  { id: 'retention', title: 'How long we keep information', body: <>
    <ul>
      <li>Your account information, while your account is open.</li>
      <li>Advertisements, until you delete them or close your account; deleting an ad also deletes its photos.</li>
      <li>Messages, reports and moderation records, for as long as needed to keep MarketDay safe and resolve disputes, and then deleted or anonymised.</li>
      <li>Server logs, for a limited period for security purposes.</li>
    </ul>
  </> },
  { id: 'choices', title: 'Your choices and rights', body: <>
    <ul>
      <li>Update your details any time on your <Link to="/account">account page</Link>.</li>
      <li>Edit or delete your advertisements from <Link to="/my-ads">My ads</Link>.</li>
      <li>Ask for a copy of your information, ask us to correct it, or ask us to close your account and delete your information, by emailing <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. We may keep some records where the law requires it or to prevent fraud.</li>
    </ul>
  </> },
  { id: 'children', title: 'Children', body: <>
    <p>MarketDay is for people aged 18 and over. We do not knowingly collect information from children. If you believe a child has created an account, please contact us and we will remove it.</p>
  </> },
  { id: 'changes', title: 'Changes and contact', body: <>
    <p>We may update this policy. If a change is significant we will tell you on the website or by email before it takes effect.</p>
    <p>{LEGAL.operator} is responsible for your information on MarketDay. Contact: <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> · {LEGAL.address}</p>
  </> },
]

export default function Privacy() {
  return <LegalPage title="Privacy Policy" sections={sections} intro={<p>This policy explains what information MarketDay collects, how we use it, who can see it and the choices you have. In short: we collect what is needed to run a safe marketplace, we show publicly only what you put in your advertisements, and we never sell your information.</p>} />
}
