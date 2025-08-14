import html from './ui/online-room.html?raw'
import { mountOnlineRoom } from './ui/controller'
import './ui/online-room.css'
import { HeaderWidget } from '@widgets/header'
import { SidebarWidget } from '@widgets/sidebar'

export function renderRoomEntrancePage() {
	const app = document.getElementById('app')!
	app.innerHTML = html
	
	// Header widgetを初期化
	const headerHost = app.querySelector('#header-widget') as HTMLElement
	HeaderWidget(headerHost)
	
	// Sidebar widgetを初期化
	const sidebarHost = app.querySelector('#sidebar-widget') as HTMLElement
	SidebarWidget(sidebarHost)
	
	// Room entrance controllerを初期化
	const root = app.querySelector('#room-entrance') as HTMLElement
	mountRoomEntrance(root, (path) => {
		history.pushState({}, '', path)
		dispatchEvent(new PopStateEvent('popstate'))
	})
}