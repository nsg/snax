import { el } from './dom'

export type OnboardingStep = 1 | 2 | 3

const labels = ['Make a token', 'Paste it', "You're in"] as const

export function createSteps(current: OnboardingStep): HTMLElement {
  const items = labels.map((label, index) => {
    const step = (index + 1) as OnboardingStep
    const state = step < current ? 'complete' : step === current ? 'current' : 'upcoming'
    const marker = el(
      'span',
      { className: 'step-rail__number', attrs: { 'aria-hidden': 'true' } },
      state === 'complete' ? '✓' : String(step),
    )
    const copy = el('span', { className: 'step-rail__label' }, label)
    const content = el('span', { className: 'step-rail__item-content' }, [marker, copy])
    const indicator = el('span', {
      className: 'step-rail__indicator',
      attrs: { 'aria-hidden': 'true' },
    })
    const children: HTMLElement[] = [content, indicator]

    if (step < labels.length) {
      children.push(el('span', {
        className: 'step-rail__separator',
        attrs: { 'aria-hidden': 'true' },
      }))
    }

    const status = state === 'current' ? 'Current step, ' : state === 'complete' ? 'Completed, ' : ''
    return el('li', {
      className: `step-rail__item is-${state}`,
      attrs: state === 'current' ? { 'aria-current': 'step', 'aria-label': `${status}${step} ${label}` } : { 'aria-label': `${status}${step} ${label}` },
    }, children)
  })

  const fullRail = el('ol', { className: 'step-rail__list' }, items)
  const compact = el('div', { className: 'step-rail__compact' }, [
    el('span', { className: 'step-rail__compact-count' }, `Step ${current} of 3`),
    el('span', { className: 'step-rail__compact-label' }, labels[current - 1]),
  ])

  return el(
    'nav',
    { className: 'step-rail', attrs: { 'aria-label': 'Onboarding progress' } },
    [fullRail, compact],
  )
}
