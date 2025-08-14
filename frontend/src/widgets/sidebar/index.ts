import sidebarHtml from './ui/sidebar.html?raw'
import './ui/sidebar.css'

export function SidebarWidget(host: HTMLElement) {
	host.innerHTML = sidebarHtml
}