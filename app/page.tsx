// SPDX-License-Identifier: AGPL-3.0-or-later
import Image from 'next/image';

export default async function HomePage() {
	return (
		<>
			<section className="homepage-banner" aria-label="Homepage banner">
				<Image
					src="/images/homepage.png"
					alt="Composable — Where style meets versatility"
					width={1200}
					height={400}
					priority
					className="homepage-banner-image"
					unoptimized
				/>
			</section>
		</>
	);
}
