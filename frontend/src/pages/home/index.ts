import html from './ui/home.html?raw'
import { HeaderWidget } from '@widgets/header'
import { SidebarWidget } from '@widgets/sidebar'

export function renderHomePage() {
	const app = document.getElementById('app')!
	app.innerHTML = html
	
	// Header widgetを初期化
	const headerHost = app.querySelector('#header-widget') as HTMLElement
	HeaderWidget(headerHost)

	// Sidebar widgetを初期化
	const sidebarHost = app.querySelector('#sidebar-widget') as HTMLElement
	SidebarWidget(sidebarHost)
}