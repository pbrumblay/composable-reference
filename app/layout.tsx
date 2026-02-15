// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from 'next';
import Link from '@/components/Link';
import './globals.css';

export const metadata: Metadata = {
	title: 'Composable! — Where style meets versatility',
	description: 'Composable! — Where style meets versatility. Shop mens, womens, baby, boys, and girls.',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body suppressHydrationWarning>
				<header className="site-header">
					<div className="site-header-inner">
						<Link href="/" className="site-logo">
							Composable!
						</Link>
						<p className="site-tagline">Where style meets versatility</p>
						<nav className="site-nav">
							<Link href="/">Home</Link>
							<Link href="/category/mens">Mens</Link>
							<Link href="/category/womens">Womens</Link>
							<Link href="/category/baby">Baby</Link>
							<Link href="/category/boys">Boys</Link>
							<Link href="/category/girls">Girls</Link>
						</nav>
					</div>
				</header>
				<main className="site-main">{children}</main>
				<footer className="site-footer">
					<div className="site-footer-inner">
						<span className="site-logo-footer">Composable!</span>
					</div>
				</footer>
			</body>
		</html>
	);
}
