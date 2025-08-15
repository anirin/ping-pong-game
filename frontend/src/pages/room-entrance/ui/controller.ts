import { createRoom, joinRoom } from "../model/room-entrance-model";

export function mountRoomEntrance(
	root: HTMLElement,
	navigate: (path: string) => void,
) {
	const $ = (sel: string) => root.querySelector(sel) as HTMLElement;
	const $err = $("#error") as HTMLParagraphElement;
	const $joinBtn = $("#joinBtn") as HTMLButtonElement;
	const $createBtn = $("#createBtn") as HTMLButtonElement;

	function setBusy(b: boolean) {
		$joinBtn.disabled = b;
		$createBtn.disabled = b;
	}

	function showError(msg: string | null) {
		$err.hidden = !msg;
		$err.textContent = msg ?? "";
	}

	$joinBtn.addEventListener("click", async () => {
		setBusy(true);
		showError(null);
		const userId = (root.querySelector("#userId") as HTMLInputElement).value;
		const roomId = (root.querySelector("#roomId") as HTMLInputElement).value;
		const res = await joinRoom(userId, roomId);
		setBusy(false);
		if (!res.ok) return showError(res.error);
		navigate(`/room/${roomId}`);
	});

	$createBtn.addEventListener("click", async () => {
		setBusy(true);
		showError(null);
		const ownerId = (root.querySelector("#userId2") as HTMLInputElement).value;
		const roomName = (root.querySelector("#roomName") as HTMLInputElement)
			.value;
		const res = await createRoom(ownerId, roomName);
		setBusy(false);
		if (!res.ok) return showError(res.error);
		navigate(`/room/${res.value}`);
	});
}
