declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
// Allow side-effect CSS imports (e.g., import "./globals.css")
declare module "*.css";
