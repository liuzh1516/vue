import { remove } from '../util/index'
import config from '../config'
import { DebuggerOptions, DebuggerEventExtraInfo } from 'v3'

let uid = 0

/**
 * @internal
 */
export interface DepTarget extends DebuggerOptions {
  id: number
  addDep(dep: Dep): void
  update(): void
}

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * @internal
 */
export default class Dep {
  static target?: DepTarget | null
  id: number
  subs: Array<DepTarget>

  constructor() {
    this.id = uid++
    this.subs = []
  }

  addSub(sub: DepTarget) {
    this.subs.push(sub)
  }

  removeSub(sub: DepTarget) {
    remove(this.subs, sub)
  }

  depend(info?: DebuggerEventExtraInfo) {
    if (Dep.target) {
      Dep.target.addDep(this)
      if (__DEV__ && info && Dep.target.onTrack) {
        Dep.target.onTrack({
          effect: Dep.target,
          ...info
        })
      }
    }
  }

  notify(info?: DebuggerEventExtraInfo) {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (__DEV__ && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      if (__DEV__ && info) {
        const sub = subs[i]
        sub.onTrigger &&
          sub.onTrigger({
            effect: subs[i],
            ...info
          })
      }
      //lzh：通知所有此dep收集的关注此变化的watcher有变化发生
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack: Array<DepTarget | null | undefined> = []

//lzh：为什么还要加一个队列？想象一种情况：watcher1监听computed属性，computed属性监听了多个属性
//这样如何收集依赖？watcher1不能直接通过index.ts中的get()做依赖收集，因为他监听的是computed属性，
//在watcher1构造时，watcher1.get()会调用computed的getter [point：1]，其中会调用watcher2(computed的watcher).evaluate()->watcher2.get()，1、指定watcher2为Dep.target
//2、调用index.ts下Rget()，将computed监听的所有属性收集依赖，3、popTarget()，这时就会将位于队列倒数第二的watcher1作为Dep.target。继续回到[point：1]执行如下逻辑：
/**
 * if (Dep.target) {
        watcher.depend()
      }
 */
//将watcher2的依赖也“复制”给了watcher1

export function pushTarget(target?: DepTarget | null) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget() {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
