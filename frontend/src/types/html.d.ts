declare module "*.html?raw" {
	const content: string;
	export default content;
}

declare module "*.css" {
	const content: void;
	export default content;
}
