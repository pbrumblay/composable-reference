// SPDX-License-Identifier: AGPL-3.0-or-later
import NextLink from 'next/link';
import type { ComponentProps } from 'react';

type Props = ComponentProps<typeof NextLink>;

/**
 * Link with prefetch disabled by default to avoid cache-handler load from
 * prefetching every viewport link. Pass prefetch={true} to opt in.
 */
export default function Link({ prefetch = false, ...rest }: Props) {
	return <NextLink prefetch={prefetch} {...rest} />;
}
