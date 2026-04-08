import { Box, Text } from "ink";
import type React from "react";
import { useEffect, useState } from "react";

const FRAMES = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];

export interface SpinnerProps {
	readonly label?: string;
}

export function Spinner({ label = "Loading..." }: SpinnerProps): React.ReactElement {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setFrame((prev) => (prev + 1) % FRAMES.length);
		}, 80);
		return () => clearInterval(interval);
	}, []);

	return (
		<Box>
			<Text color="cyan">{FRAMES[frame]} </Text>
			<Text>{label}</Text>
		</Box>
	);
}
