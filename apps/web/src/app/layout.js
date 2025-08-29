import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
const inter = Inter({ subsets: ['latin'] });
export const metadata = {
    title: 'c360 - Compliance Tool',
    description: 'Lightweight compliance management for startups',
};
export default function RootLayout({ children, }) {
    return (<html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>);
}
