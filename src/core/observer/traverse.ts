import { _Set as Set, isObject, isArray } from '../util/index'
import type { SimpleSet } from '../util/index'
import VNode from '../vdom/vnode'

const seenObjects = new Set()

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
export function traverse(val: any) {
  _traverse(val, seenObjects)
  seenObjects.clear()
  return val
}

function _traverse(val: any, seen: SimpleSet) {
  let i, keys
  const isA = isArray(val)
  if (
    (!isA && !isObject(val)) ||
    Object.isFrozen(val) ||
    val instanceof VNode
  ) {
    return
  }
  if (val.__ob__) {
    //lzh：这个dep来自于new Observer的时候内部创建的dep，有__ob__的一定是Object，property没有__ob__
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    //lzh：这里val[keys[i]]触发了reactive的getter，会触发依赖收集
    while (i--) _traverse(val[keys[i]], seen)
  }
}
