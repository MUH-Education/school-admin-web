import { zodResolver } from '@hookform/resolvers/zod'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router'
import { z } from 'zod'
import { api } from '@/api/client'
import { landingPath } from '@/app/landingPath'
import { useDefaultLanguage } from '@/i18n'
import { LanguageButton } from '@/i18n/LanguageButton'
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

type PhoneForm = { phone: string }
type CodeForm = { otp: string }

export function LoginPage() {
  const { t, i18n } = useTranslation()
  useDefaultLanguage('en')
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
      setMessage(loginErrorMessage(error, t))
      if (error instanceof ApiError && error.code === 'OTP_TOO_MANY_REQUESTS') {
        startWait(error.retryAfterSeconds ?? 60)
      }
      return false
    }
  }

  return (
    <div
      lang={i18n.language}
      className={`mx-auto flex min-h-screen w-full max-w-[420px] flex-col bg-paper ${i18n.language === 'hi' ? 'font-hindi' : ''}`}
    >
      <div className="flex flex-col gap-11 bg-ink px-6 pt-5 pb-9 text-white">
        <div className="flex justify-end">
          <LanguageButton />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-[15px] font-medium text-dust-light">{t('login.org')}</div>
          <h1 className="text-[34px] leading-[1.2] font-bold">{t('login.title')}</h1>
          <p className="text-[17px] text-side-text">{t('login.subtitle')}</p>
        </div>
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
        <p className="mt-6 text-[15.5px] text-ink-soft">{t('login.once')}</p>
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
  const { t } = useTranslation()
  const phoneSchema = useMemo(
    () =>
      z.object({
        phone: z
          .string()
          .refine((value) => normalizePhone(value) !== null, t('login.errors.phone')),
      }),
    [t],
  )
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
      className="flex flex-col gap-[22px]"
    >
      <Field large label={t('login.mobile')} error={errors.phone?.message}>
        <PhoneInput
          placeholder="98123 45678"
          className="min-h-14 text-[19px]"
          {...register('phone')}
        />
      </Field>
      <Button
        type="submit"
        saving={isSubmitting}
        savingLabel={t('common.sending')}
        disabled={wait > 0}
        className="min-h-[60px] text-[20px]"
      >
        {t('login.sendCode')}
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
  const { t } = useTranslation()
  const codeSchema = useMemo(
    () => z.object({ otp: z.string().regex(/^\d{6}$/, t('login.errors.code')) }),
    [t],
  )
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
      onMessage(loginErrorMessage(error, t))
      if (error instanceof ApiError && error.code === 'OTP_LOCKED') reset({ otp: '' })
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-[22px]">
      <p className="text-ink-soft">{t('login.codeSent')}</p>
      <Field large label={t('login.code')} error={errors.otp?.message}>
        <TextInput
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="min-h-14 font-mono text-[19px] tracking-[0.3em]"
          {...register('otp')}
        />
      </Field>
      <Button
        type="submit"
        saving={isSubmitting}
        savingLabel={t('common.sending')}
        className="min-h-[60px] text-[20px]"
      >
        {t('login.logIn')}
      </Button>
      <div className="flex flex-wrap justify-between gap-3 text-[14px]">
        <button
          type="button"
          disabled={wait > 0}
          onClick={() => void onResend()}
          className="cursor-pointer text-canal underline disabled:cursor-not-allowed disabled:text-ink-soft disabled:no-underline"
        >
          {wait > 0 ? t('login.resendWait', { seconds: wait }) : t('login.resend')}
        </button>
        <button
          type="button"
          onClick={onChangeNumber}
          className="cursor-pointer text-canal underline"
        >
          {t('login.changeNumber')}
        </button>
      </div>
    </form>
  )
}
