/** dragleave가 래퍼 내부 자식 요소 사이 이동일 뿐이면(진짜 이탈이 아니면) false */
export function shouldDismissDragHighlight(
  wrapper: { contains(node: Node): boolean },
  relatedTarget: EventTarget | null
): boolean {
  const related = relatedTarget as Node | null
  return !(related && wrapper.contains(related))
}
