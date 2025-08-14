import html from './ui/room-entrance.html?raw'
import { mountRoomEntrance } from './ui/controller'

export function initRoomEntrancePage() {
	const app = document.getElementById('app')!
	app.innerHTML = html
	const root = app.querySelector('#room-entrance') as HTMLElement
	mountRoomEntrance(root, (path) => {
		history.pushState({}, '', path)
		dispatchEvent(new PopStateEvent('popstate'))
	})
}