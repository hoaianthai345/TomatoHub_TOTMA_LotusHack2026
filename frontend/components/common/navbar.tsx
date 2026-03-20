import Link from "next/link";
import { APP_NAME, NAV_LINKS } from "@/lib/constants";
import Container from "./container";

export default function Navbar() {
	return (
		<header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
			<Container className="flex h-16 items-center justify-between">
				<Link href="/" className="text-xl font-bold text-red-600">
					{APP_NAME}
				</Link>

				<nav className="hidden gap-6 md:flex">
					{NAV_LINKS.map((item) => (
						<Link key={item.href} href={item.href} className="text-sm font-medium text-gray-700 transition hover:text-red-600">
							{item.label}
						</Link>
					))}
				</nav>
			</Container>
		</header>
	);
}
