import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAppNav } from '../App'
import { t, type AppLanguage } from '../lib/i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { tx } from '../lib/uiText'

type FormData = {
    name: string
    mobile: string
    gender: string
    age: string
    email: string
    password: string
    confirmPassword: string
    state: string
    district: string
    village: string
    latitude: string
    longitude: string
    landAcres: string
    soilType: string
    irrigationType: string
    waterSource: string
    crop: string
    variety: string
    sowingDate: string
    season: string
}

const initialForm: FormData = {
    name: '', mobile: '', gender: '', age: '', email: '', password: '', confirmPassword: '',
    state: 'Gujarat', district: '', village: '', latitude: '', longitude: '',
    landAcres: '', soilType: '', irrigationType: '', waterSource: '',
    crop: '', variety: '', sowingDate: '', season: '',
}

export default function SignUp({ lang = 'en' }: { lang?: AppLanguage }) {
    const { navigate, lang: globalLang, setLang } = useAppNav()
    const activeLang = globalLang || lang
    const [form, setForm] = useState<FormData>(initialForm)
    const [loading, setLoading] = useState(false)
    const [locating, setLocating] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const set = (key: keyof FormData, value: string) =>
        setForm(prev => ({ ...prev, [key]: value }))

    const useLocation = () => {
        if (!navigator.geolocation) {
            setError('Location is not supported by this browser. Enter coordinates manually.')
            return
        }
        setError('')
        setLocating(true)
        navigator.geolocation.getCurrentPosition(
            position => {
                set('latitude', position.coords.latitude.toFixed(6))
                set('longitude', position.coords.longitude.toFixed(6))
                setLocating(false)
            },
            () => {
                setError('Could not access your location. Please allow location access or enter coordinates manually.')
                setLocating(false)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const handleSignUp = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setMessage('')

        if (form.password.length < 6) return setError('Password must be at least 6 characters.')
        if (form.password !== form.confirmPassword) return setError('Passwords do not match.')
        if (!form.latitude || !form.longitude) return setError('Please provide your farm coordinates or use the location button.')

        setLoading(true)

        try {
            // 1. Create the authenticated Supabase account.
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: form.email.trim(),
                password: form.password,
                options: { data: { name: form.name.trim(), role: 'FARMER' } },
            })
            if (authError) throw authError
            if (!authData.user) throw new Error('Account could not be created.')

            // Email confirmation may be enabled in Supabase.
            // In that case the database rows should be created after the farmer confirms
            // the email and logs in. We therefore only save the profile immediately when
            // a session exists.
            if (!authData.session) {
                setMessage('Account created. Please confirm your email, then use Farmer Login. Your registration details will be completed after confirmation.')
                return
            }

            const userId = authData.user.id
            const latitude = Number(form.latitude)
            const longitude = Number(form.longitude)
            const landAcres = Number(form.landAcres)

            // 2. Save farmer profile.
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: userId,
                name: form.name.trim(),
                phone: form.mobile.trim(),
                gender: form.gender,
                age: Number(form.age),
                state: form.state.trim(),
                district: form.district.trim(),
                village: form.village.trim(),
                latitude,
                longitude,
                role: 'FARMER',
            })
            if (profileError) throw profileError

            // 3. Save the field.
            const { data: field, error: fieldError } = await supabase.from('fields').insert({
                farmer_id: userId,
                name: `${form.name.trim()}'s Field`,
                latitude,
                longitude,
                soil_type: form.soilType,
                irrigation_type: form.irrigationType,
                water_source: form.waterSource,
                land_acres: landAcres,
            }).select('id').single()
            if (fieldError) throw fieldError

            // 4. Save current crop.
            const { error: cropError } = await supabase.from('farmer_crops').insert({
                farmer_id: userId,
                field_id: field.id,
                crop_name: form.crop.trim(),
                variety: form.variety.trim(),
                sowing_date: form.sowingDate,
                season: form.season,
            })
            if (cropError) throw cropError

            setMessage('Registration complete. Welcome to AgriSense!')
            setTimeout(() => navigate('farmer'), 700)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to complete registration.')
        } finally {
            setLoading(false)
        }
    }

    const inputClass = 'w-full border border-stone-200/90 rounded-xl px-4 py-3 text-sm text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all shadow-2xs'
    const selectClass = inputClass + ' bg-white'
    const labelClass = 'block text-sm font-semibold text-stone-700 mb-2'


    return (
        <div className="min-h-full bg-stone-50 flex flex-col">
            <header className="bg-white border-b border-stone-200">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                    <button onClick={() => navigate('role-selection')} className="flex items-center gap-2 text-green-800 hover:text-green-600">
                        <span className="text-lg">←</span>
                        <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl">AgriSense</span>
                    </button>
                    <div className="flex items-center gap-3"><LanguageSwitcher lang={activeLang} setLang={setLang} compact /><span className="text-xs text-stone-400">{t('signUpTitle', activeLang)}</span></div>
                </div>
            </header>

            <main className="flex-1 px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl md:text-4xl text-green-900 mb-2">
                            {t('signUpTitle', activeLang)}
                        </h1>
                        <p className="text-stone-500">{t('signUpSubtitle', activeLang)}</p>
                    </div>

                    <form onSubmit={handleSignUp} className="space-y-6">
                        <Section title="1. Account & Basic Profile" subtitle={tx('Your login credentials and personal details.', activeLang)}>
                            <Field label={t('fullNameLabel', activeLang)} required><input className={inputClass} placeholder={t('fullNamePlaceholder', activeLang)} value={form.name} onChange={e => set('name', e.target.value)} required /></Field>
                            <Field label={t('mobileLabel', activeLang)} required><input className={inputClass} placeholder={t('mobilePlaceholder', activeLang)} type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} required /></Field>
                            <Field label={t('genderLabel', activeLang)} required><select className={selectClass} value={form.gender} onChange={e => set('gender', e.target.value)} required><option value="">{tx('Select gender', activeLang)}</option><option value="Male">{tx('Male', activeLang)}</option><option value="Female">{tx('Female', activeLang)}</option><option value="Other">{tx('Other', activeLang)}</option></select></Field>
                            <Field label={t('ageLabel', activeLang)} required><input className={inputClass} type="number" min="18" max="120" value={form.age} onChange={e => set('age', e.target.value)} required /></Field>
                            <Field label={t('emailLabel', activeLang)} required><input className={inputClass} type="email" value={form.email} onChange={e => set('email', e.target.value)} required autoComplete="email" /></Field>
                            <Field label={t('passwordLabel', activeLang)} required><input className={inputClass} type="password" minLength={6} value={form.password} onChange={e => set('password', e.target.value)} required autoComplete="new-password" /></Field>
                            <Field label={t('passwordConfirmLabel', activeLang)} required><input className={inputClass} type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required autoComplete="new-password" /></Field>
                        </Section>

                        <Section title={`2. ${t('farmLocationTitle', activeLang)}`} subtitle={tx('Used to personalize local weather and regional risk.', activeLang)}>
                            <Field label={t('stateLabel', activeLang)} required><input className={inputClass} value={form.state} onChange={e => set('state', e.target.value)} required /></Field>
                            <Field label={t('districtLabel', activeLang)} required><input className={inputClass} value={form.district} onChange={e => set('district', e.target.value)} required /></Field>
                            <Field label={t('villageLabel', activeLang)} required><input className={inputClass} value={form.village} onChange={e => set('village', e.target.value)} required /></Field>
                            <div className="md:col-span-2">
                                <button type="button" onClick={useLocation} disabled={locating} className="border border-green-700 text-green-800 hover:bg-green-50 font-semibold px-4 py-2.5 rounded-lg text-sm">
                                    {locating ? t('locatingText', activeLang) : t('useLocationBtn', activeLang)}
                                </button>
                                <p className="text-xs text-stone-400 mt-2">{tx('Or enter your farm coordinates manually.', activeLang)}</p>
                            </div>
                            <Field label={t('latitudeLabel', activeLang)} required><input className={inputClass} type="number" step="any" value={form.latitude} onChange={e => set('latitude', e.target.value)} required /></Field>
                            <Field label={t('longitudeLabel', activeLang)} required><input className={inputClass} type="number" step="any" value={form.longitude} onChange={e => set('longitude', e.target.value)} required /></Field>
                        </Section>

                        <Section title="3. Field Information" subtitle={tx('Tell us about the land and water available to you.', activeLang)}>
                            <Field label={t('landAcresLabel', activeLang)} required><input className={inputClass} type="number" min="0" step="0.01" value={form.landAcres} onChange={e => set('landAcres', e.target.value)} required /></Field>
                            <Field label={t('soilTypeLabel', activeLang)} required><select className={selectClass} value={form.soilType} onChange={e => set('soilType', e.target.value)} required><option value="">{tx('Select soil type', activeLang)}</option><option value="Loamy">{tx('Loamy', activeLang)}</option><option value="Clay">{tx('Clay', activeLang)}</option><option value="Sandy">{tx('Sandy', activeLang)}</option><option value="Silty">{tx('Silty', activeLang)}</option><option value="Black Soil">{tx('Black Soil', activeLang)}</option><option value="Red Soil">{tx('Red Soil', activeLang)}</option><option value="Alluvial">{tx('Alluvial', activeLang)}</option><option value="Other">{tx('Other', activeLang)}</option></select></Field>
                            <Field label={t('irrigationTypeLabel', activeLang)} required><select className={selectClass} value={form.irrigationType} onChange={e => set('irrigationType', e.target.value)} required><option value="">{tx('Select irrigation', activeLang)}</option><option value="Drip">{tx('Drip', activeLang)}</option><option value="Sprinkler">{tx('Sprinkler', activeLang)}</option><option value="Flood">{tx('Flood', activeLang)}</option><option value="Rainfed">{tx('Rainfed', activeLang)}</option><option value="Other">{tx('Other', activeLang)}</option></select></Field>
                            <Field label={t('waterSourceLabel', activeLang)} required><select className={selectClass} value={form.waterSource} onChange={e => set('waterSource', e.target.value)} required><option value="">{tx('Select water source', activeLang)}</option><option value="Borewell">{tx('Borewell', activeLang)}</option><option value="Canal">{tx('Canal', activeLang)}</option><option value="River">{tx('River', activeLang)}</option><option value="Farm Pond">{tx('Farm Pond', activeLang)}</option><option value="Rainwater">{tx('Rainwater', activeLang)}</option><option value="Other">{tx('Other', activeLang)}</option></select></Field>
                        </Section>

                        <Section title={`4. ${t('cropDetailsTitle', activeLang)}`} subtitle={tx('Your current crop becomes the starting point for AgriSense monitoring.', activeLang)}>
                            <Field label={t('primaryCropLabel', activeLang)} required><input className={inputClass} value={form.crop} onChange={e => set('crop', e.target.value)} required placeholder={tx('e.g. Tomato', activeLang)} /></Field>
                            <Field label={t('varietyLabel', activeLang)} required><input className={inputClass} value={form.variety} onChange={e => set('variety', e.target.value)} required placeholder={tx('e.g. Arka Rakshak', activeLang)} /></Field>
                            <Field label={t('sowingDateLabel', activeLang)} required><input className={inputClass} type="date" value={form.sowingDate} onChange={e => set('sowingDate', e.target.value)} required /></Field>
                            <Field label={t('seasonLabel', activeLang)} required><select className={selectClass} value={form.season} onChange={e => set('season', e.target.value)} required><option value="">{tx('Select season', activeLang)}</option><option value="Kharif">{tx('Kharif', activeLang)}</option><option value="Rabi">{tx('Rabi', activeLang)}</option><option value="Zaid">{tx('Zaid', activeLang)}</option><option value="Summer">{tx('Summer', activeLang)}</option><option value="Winter">{tx('Winter', activeLang)}</option><option value="Other">{tx('Other', activeLang)}</option></select></Field>
                        </Section>

                        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
                        {message && <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">{message}</div>}

                        <div className="flex justify-end pb-8">
                            <button type="submit" disabled={loading} className="bg-green-700 hover:bg-green-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors disabled:opacity-60">
                                {loading ? t('creatingAccountText', activeLang) : t('btnCreateFarmerAccount', activeLang)}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-green-900">{title}</h2>
            <p className="text-sm text-stone-500 mt-1 mb-5">{subtitle}</p>
            <div className="grid md:grid-cols-2 gap-5">{children}</div>
        </section>
    )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return <div><label className="block text-sm font-medium text-stone-700 mb-1.5">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>{children}</div>
}
