import { EventEmitter } from "events";

// todo : ここで event emitter を管理しているのは良くないので、いつか別のところに移す
export const globalEventEmitter = new EventEmitter();
