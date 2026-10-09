import { zodResolver } from '@hookform/resolvers/zod'
import { lazy, Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import { z } from 'zod'
import { api } from '@/api/client'
import { landingPath } from '@/app/landing'
import { normalizePhone } from '@/lib/phone'
import { Button } from '@/ui/Button'
import { Field } from '@/ui/Field'
import { PhoneInput } from '@/ui/PhoneInput'
import { TextInput } from '@/ui/TextInput'
import { loginErrorMessage } from './loginMessages'
import type { LoginResponse, OtpRequestResponse } from './types'
import { useAuth } from './useAuth'
import { useCountdown } from './useCountdown'
import { ApiError } from '@/api/errors'

// Only exists in mock mode. In the production build this line is removed.
const SampleLogins =
  import.meta.env.VITE_API_MODE === 'mock' ? lazy(() => import('./SampleLogins')) : null

const phoneSchema = z.object({
  phone: z
    .string()
    .refine((value) => normalizePhone(value) !== null, 'Enter a 10-digit mobile number.'),
})
const codeSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
})
type PhoneForm = z.infer<typeof phoneSchema>
type CodeForm = z.infer<typeof codeSchema>

export function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const [phone, setPhone] = useState<string | null>(null)
  const [wait, startWait] = useCountdown()
  const [message, setMessage] = useState<string | null>(null)

  if (user) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? landingPath(user)} replace />
  }

  async function requestCode(value: string) {
    setMessage(null)
    try {
      const answer = await api<OtpRequestResponse>('POST', '/auth/otp/request', { phone: value })
      setPhone(value)
      startWait(answer.resendAfterSeconds)
      return true
    } catch (error) {
      setMessage(loginErrorMessage(error))
      if (error instanceof ApiError && error.code === 'OTP_TOO_MANY_REQUESTS') {
        startWait(error.retryAfterSeconds ?? 60)
      }
      return false
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col bg-paper">
      <div className="flex flex-col gap-1.5 bg-ink px-6 pt-12 pb-9 text-white">
        <div className="text-[15px] font-medium text-dust-light">MUH Jain Global School</div>
        <h1 className="text-[34px] leading-tight font-bold">School admin</h1>
        <p className="text-[17px] text-side-text">Log in with your mobile number</p>
      </div>

      <div className="flex flex-1 flex-col px-6 pt-8 pb-6">
        {phone === null ? (
          <PhoneStep wait={wait} onSend={requestCode} />
        ) : (
          <CodeStep
            phone={phone}
            wait={wait}
            onChangeNumber={() => {
              setPhone(null)
              setMessage(null)
            }}
            onResend={() => requestCode(phone)}
            onLogin={login}
            onMessage={setMessage}
          />
        )}
        {message && (
          <p role="alert" className="mt-4 border border-bad bg-bad-soft p-3 font-semibold text-bad">
            {message}
            {wait > 0 && phone === null ? ` (${wait} s)` : ''}
          </p>
        )}
        {SampleLogins && (
          <Suspense fallback={null}>
            <SampleLogins onLogin={login} />
          </Suspense>
        )}
      </div>
    </div>
  )
}

function PhoneStep({
  wait,
  onSend,
}: {
  wait: number
  onSend: (phone: string) => Promise<boolean>
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) })

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async ({ phone }) => {
        await onSend(phone)
      })}
      className="flex flex-col gap-5"
    >
      <Field label="Mobile number" error={errors.phone?.message}>
        <PhoneInput placeholder="98123 45678" {...register('phone')} />
      </Field>
      <Button type="submit" saving={isSubmitting} disabled={wait > 0} className="min-h-14 text-lg">
        Send code
      </Button>
    </form>
  )
}

interface CodeStepProps {
  phone: string
  wait: number
  onChangeNumber: () => void
  onResend: () => Promise<boolean>
  onLogin: (response: LoginResponse) => void
  onMessage: (message: string | null) => void
}

function CodeStep({ phone, wait, onChangeNumber, onResend, onLogin, onMessage }: CodeStepProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CodeForm>({ resolver: zodResolver(codeSchema) })

  async function submit({ otp }: CodeForm) {
    onMessage(null)
    try {
      onLogin(await api<LoginResponse>('POST', '/auth/otp/verify', { phone, otp }))
    } catch (error) {
      onMessage(loginErrorMessage(error))
      if (error instanceof ApiError && error.code === 'OTP_LOCKED') reset({ otp: '' })
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
      <p className="text-ink-soft">
        If this number is registered, a code was sent on WhatsApp or SMS.
      </p>
      <Field label="6-digit code" error={errors.otp?.message}>
        <TextInput
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="font-mono tracking-[0.3em]"
          {...register('otp')}
        />
      </Field>
      <Button type="submit" saving={isSubmitting} className="min-h-14 text-lg">
        Log in
      </Button>
      <div className="flex flex-wrap justify-between gap-3 text-[14px]">
        <button
          type="button"
          disabled={wait > 0}
          onClick={() => void onResend()}
          className="cursor-pointer text-canal underline disabled:cursor-not-allowed disabled:text-ink-soft disabled:no-underline"
        >
          {wait > 0 ? `Send the code again (${wait} s)` : 'Send the code again'}
        </button>
        <button
          type="button"
          onClick={onChangeNumber}
          className="cursor-pointer text-canal underline"
        >
          Change number
        </button>
      </div>
    </form>
  )
}
