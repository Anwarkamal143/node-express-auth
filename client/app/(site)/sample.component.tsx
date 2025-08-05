interface SampleProps {
	children: React.ReactNode;
}

export function Sample({ children }: SampleProps) {
	return (
		<>
			<h1>Sample</h1>
			{children}
		</>
	);
}
