import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { i18n } from '@/i18n'
import { ANSWER_BUTTON_MIN_HEIGHT, ChildRow } from './ChildRow'
import { FooterAction, OutlineButton } from './Footer'
import { PhoneHeader } from './PhoneHeader'
import { SendingStrip } from './SendingStrip'
import { DoneStopLine, StopHeader } from './StopLines'

beforeEach(async () => {
  await i18n.changeLanguage('hi')
})

function strip(props: { waiting?: number; problems?: number; online?: boolean }) {
  const onSeeProblems = vi.fn()
  render(
    <SendingStrip
      waiting={props.waiting ?? 0}
      problems={props.problems ?? 0}
      online={props.online ?? true}
      onSeeProblems={onSeeProblems}
    />,
  )
  return onSeeProblems
}

describe('SendingStrip: the four states', () => {
  it('nothing waiting: green, "everything reached the office"', () => {
    strip({})
    expect(screen.getByRole('status')).toHaveTextContent('सब जानकारी ऑफ़िस पहुँच गई')
    expect(document.querySelector('.bg-good')).not.toBeNull()
  })

  it('nothing waiting and no network: still green, nothing can be lost', () => {
    strip({ online: false })
    expect(screen.getByRole('status')).toHaveTextContent('सब जानकारी ऑफ़िस पहुँच गई')
  })

  it('taps waiting and online: amber, "N taps are being sent"', () => {
    strip({ waiting: 3 })
    expect(screen.getByRole('status')).toHaveTextContent('3 टैप भेज रहे हैं…')
    expect(document.querySelector('.bg-dust')).not.toBeNull()
    expect(screen.queryByText('नेटवर्क नहीं है')).not.toBeInTheDocument()
  })

  it('taps waiting and offline: the big amber banner of MobileOffline', () => {
    strip({ waiting: 4, online: false })
    expect(screen.getByText('नेटवर्क नहीं है')).toBeInTheDocument()
    expect(
      screen.getByText(
        '4 टैप फ़ोन में सेव हैं। नेटवर्क आते ही अपने आप ऑफ़िस चले जाएँगे। आप काम करते रहें।',
      ),
    ).toBeInTheDocument()
  })

  it('problems: a red line with a button to read them', async () => {
    const onSee = strip({ problems: 2 })
    expect(screen.getByText('2 टैप ऑफ़िस ने नहीं लिया। ऑफ़िस को बताएँ।')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'देखें' }))
    expect(onSee).toHaveBeenCalled()
  })

  it('shows the red line together with the green strip', () => {
    strip({ problems: 1 })
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('सब जानकारी ऑफ़िस पहुँच गई')
    expect(screen.getByText(/1 टैप ऑफ़िस ने नहीं लिया/)).toBeInTheDocument()
  })
})

describe('ChildRow', () => {
  function row(change: { pressedIn?: boolean; pressedOut?: boolean } = {}) {
    const board = vi.fn()
    const absent = vi.fn()
    render(
      <ChildRow
        name="आर्यन"
        sub="कक्षा 3 B"
        tone={change.pressedIn ? 'good' : change.pressedOut ? 'bad' : null}
        buttons={[
          { label: 'चढ़ गए', pressed: !!change.pressedIn, tone: 'good', width: 98, onPress: board },
          {
            label: 'नहीं आए',
            pressed: !!change.pressedOut,
            tone: 'bad',
            width: 82,
            onPress: absent,
          },
        ]}
      />,
    )
    return { board, absent }
  }

  it('has two answer buttons, each at least 52px high', () => {
    row()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      expect(button.style.minHeight).toBe(`${ANSWER_BUTTON_MIN_HEIGHT}px`)
    }
    expect(ANSWER_BUTTON_MIN_HEIGHT).toBeGreaterThanOrEqual(52)
  })

  it('tells which answer is shown with aria-pressed and a coloured row', () => {
    row({ pressedIn: true })
    expect(screen.getByRole('button', { name: 'चढ़ गए' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'नहीं आए' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('group', { name: 'आर्यन' })).toHaveClass('bg-good-soft')
  })

  it('calls the right handler', async () => {
    const { board, absent } = row()
    await userEvent.click(screen.getByRole('button', { name: 'नहीं आए' }))
    expect(absent).toHaveBeenCalledTimes(1)
    expect(board).not.toHaveBeenCalled()
  })

  it('shows a tap that is only on the phone in amber words', () => {
    render(
      <ChildRow
        name="यश"
        sub="LKG · 7:56 · फ़ोन में सेव"
        pending
        buttons={[{ label: '✓ चढ़ गए', pressed: true, tone: 'good', width: 98, onPress: () => {} }]}
      />,
    )
    expect(screen.getByText('LKG · 7:56 · फ़ोन में सेव')).toHaveClass('text-dust-text')
  })
})

describe('stop lines, header and footer', () => {
  it('DoneStopLine is one grey line; with onOpen it is a button', async () => {
    const onOpen = vi.fn()
    render(<DoneStopLine left="✓ स्टॉप 1 · साधनवास" right="5 चढ़े · 7:26" onOpen={onOpen} />)
    await userEvent.click(screen.getByRole('button', { name: /साधनवास/ }))
    expect(onOpen).toHaveBeenCalled()
  })

  it('StopHeader shows the stop and its summary', () => {
    render(<StopHeader title="स्टॉप 2 · जाखल" summary="4 चढ़े · 0 नहीं आए · 3 बाकी" />)
    expect(screen.getByRole('heading', { name: 'स्टॉप 2 · जाखल' })).toBeInTheDocument()
    expect(screen.getByText('4 चढ़े · 0 नहीं आए · 3 बाकी')).toBeInTheDocument()
  })

  it('PhoneHeader has a back link, the title, the route and a counter', () => {
    render(
      <MemoryRouter>
        <PhoneHeader
          title="सुबह चढ़ाना"
          subtitle="रूट 4 · वैन 4"
          counter={{ value: '11 / 19', label: 'बच्चे चढ़े' }}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'वापस' })).toHaveAttribute('href', '/trip')
    expect(screen.getByRole('heading', { name: 'सुबह चढ़ाना' })).toBeInTheDocument()
    expect(screen.getByText('11 / 19')).toBeInTheDocument()
  })

  it('footer buttons are at least 56px high, and a disabled one cannot be pressed', async () => {
    const onClick = vi.fn()
    render(
      <MemoryRouter>
        <FooterAction disabled onClick={onClick}>
          बस चलाने से पहले 3 का जवाब दें
        </FooterAction>
        <OutlineButton href="tel:+919812340002">ऑफ़िस को फ़ोन करें</OutlineButton>
      </MemoryRouter>,
    )
    const gated = screen.getByRole('button', { name: /बस चलाने से पहले/ })
    expect(gated).toBeDisabled()
    expect(gated.style.minHeight).toBe('56px')
    await userEvent.click(gated)
    expect(onClick).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'ऑफ़िस को फ़ोन करें' }).style.minHeight).toBe('56px')
  })
})
