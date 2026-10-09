import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAppNav } from '../App'
import { t, type AppLanguage } from '../lib/i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'

type LoginRole = 'FARMER' | 'OFFICER'

export default function Login({ role, lang = 'en' }: { role: LoginRole; lang?: AppLanguage }) {
    const { navigate, lang: globalLang, setLang } = useAppNav()
    const activeLang = globalLang || lang
    const [email, setEmail] = useState(role === 'FARMER' ? 'farmer@agrisense.com' : 'officer@agrisense.com')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const isFarmer = role === 'FARMER'

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })
            if (authError) throw authError
            if (!data.user) throw new Error('Login succeeded but no user was returned.')
            if (!data.session) throw new Error('Login succeeded but no session was returned.')

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, name, role, phone, gender, age, state, district, village')
                .eq('id', data.user.id)
                .single()

            if (profileError) {
                console.error('AgriSense profile query failed:', profileError)
                throw new Error(`Could not load your AgriSense profile: ${profileError.message}`)
            }
            if (!profile) throw new Error('Could not load your AgriSense profile: no profile row was returned.')
            if (profile.role !== role) {
                await supabase.auth.signOut()
                throw new Error(`This account is registered as ${profile.role === 'FARMER' ? 'a Farmer' : 'an Extension Officer'}. Please choose the correct role.`)
            }

            if (isFarmer) {
                const [{ data: field }, { data: crop }] = await Promise.all([
                    supabase.from('fields').select('id').eq('farmer_id', data.user.id).limit(1).maybeSingle(),
                    supabase.from('farmer_crops').select('id').eq('farmer_id', data.user.id).limit(1).maybeSingle(),
                ])

                const complete = Boolean(
                    profile.name &&
                    profile.phone &&
                    profile.gender &&
                    profile.age &&
                    profile.state &&
                    profile.district &&
                    profile.village &&
                    field?.id &&
                    crop?.id
                )

                if (!complete) {
                    await supabase.auth.signOut()
                    throw new Error('Your farmer profile is not set up yet. Please use Sign Up to complete the one-time setup, or finish your profile before logging in.')
                }

                navigate('farmer')
            } else {
                navigate('officer')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to login. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const inputClass = isFarmer
        ? 'w-full border border-stone-200/90 rounded-xl px-4 py-3 text-sm text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all shadow-2xs'
        : 'w-full border border-stone-200/90 rounded-xl px-4 py-3 text-sm text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-700/20 focus:border-slate-700 transition-all shadow-2xs'

    return (
        <div className="min-h-full bg-stone-50 flex flex-col">
            <div className="bg-white border-b border-stone-200/80">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => navigate('role-selection')} className={`flex items-center gap-2 ${isFarmer ? 'text-emerald-900 hover:text-emerald-700' : 'text-slate-800 hover:text-slate-600'} transition-colors font-medium`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                        <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl">AgriSense</span>
                    </button>
                    <LanguageSwitcher lang={activeLang} setLang={setLang} compact />
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${isFarmer ? 'bg-emerald-100/80' : 'bg-slate-100'}`}>
                            {isFarmer
                                ? <svg className="w-7 h-7 text-emerald-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a5 5 0 1 0 5 5c0-.3 0-.6-.05-.88" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>
                                : <svg className="w-7 h-7 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 8h4" /><path d="M7 12h8" /><path d="M13 8h2" /></svg>
                            }
                        </div>
                        <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className={`text-3xl ${isFarmer ? 'text-emerald-950' : 'text-slate-900'} mb-2`}>
                            {isFarmer ? t('loginFarmerTitle', activeLang) : t('loginOfficerTitle', activeLang)}
                        </h1>
                        <p className="text-stone-600 text-sm">{t('loginSubtitle', activeLang)}</p>
                    </div>

                    <form onSubmit={handleLogin} className="bg-white border border-stone-200/90 rounded-2xl p-7 shadow-soft">
                        <label className="block text-sm font-semibold text-stone-700 mb-2">{t('emailLabel', activeLang)}</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
                            className={`${inputClass} mb-5`}
                            placeholder={t('emailPlaceholder', activeLang)} />

                        <label className="block text-sm font-semibold text-stone-700 mb-2">{t('passwordLabel', activeLang)}</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                            className={inputClass}
                            placeholder={t('passwordPlaceholder', activeLang)} />

                        {error && <div className="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">{error}</div>}

                        <button type="submit" disabled={loading}
                            className={`w-full mt-6 text-white font-semibold py-3.5 rounded-xl transition-all shadow-xs disabled:opacity-60 ${isFarmer ? 'bg-emerald-800 hover:bg-emerald-900' : 'bg-slate-800 hover:bg-slate-900'}`}>
                            {loading ? t('signingIn', activeLang) : (isFarmer ? t('loginAsFarmer', activeLang) : t('loginAsOfficer', activeLang))}
                        </button>

                        {isFarmer && (
                            <button type="button" onClick={() => navigate('signup-farmer')}
                                className="w-full mt-4 text-emerald-800 hover:text-emerald-950 text-sm py-2 font-semibold transition-colors">
                                {t('newFarmerPrompt', activeLang)}
                            </button>
                        )}

                        <button type="button" onClick={() => navigate('role-selection')} className="w-full mt-2 text-stone-500 hover:text-stone-700 text-sm py-2 font-medium">
                            {t('chooseRolePrompt', activeLang)}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
