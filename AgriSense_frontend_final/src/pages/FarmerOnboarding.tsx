import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAppNav } from '../App'
import { tx } from '../lib/uiText'
import LanguageSwitcher from '../components/LanguageSwitcher'

type ProfileData = {
  name: string
  phone: string
  gender: string
  age: string
  state: string
  district: string
  village: string
  latitude: string
  longitude: string
}

type FieldData = {
  area: string
  soil_type: string
  irrigation_type: string
  water_source: string
}

type CropData = {
  crop: string
  variety: string
  sowing_date: string
  season: string
}

const initialProfile: ProfileData = {
  name: '', phone: '', gender: '', age: '', state: '', district: '', village: '', latitude: '', longitude: '',
}

const initialField: FieldData = {
  area: '', soil_type: '', irrigation_type: '', water_source: '',
}

const initialCrop: CropData = {
  crop: '', variety: '', sowing_date: '', season: '',
}

export default function FarmerOnboarding() {
  const { navigate, lang, setLang } = useAppNav()
  const [profile, setProfile] = useState<ProfileData>(initialProfile)
  const [field, setField] = useState<FieldData>(initialField)
  const [crop, setCrop] = useState<CropData>(initialCrop)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true
    const loadExisting = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('login-farmer')
        return
      }

      const [{ data: p }, { data: f }, { data: c }] = await Promise.all([
        supabase.from('profiles').select('name, phone, gender, age, state, district, village, latitude, longitude').eq('id', user.id).maybeSingle(),
        supabase.from('fields').select('area, soil_type, irrigation_type, water_source, latitude, longitude').eq('farmer_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('farmer_crops').select('crop, variety, sowing_date, season').eq('farmer_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle(),
      ])

      if (!mounted) return
      if (p) {
        setProfile({
          name: p.name ?? '', phone: p.phone ?? '', gender: p.gender ?? '', age: p.age != null ? String(p.age) : '',
          state: p.state ?? '', district: p.district ?? '', village: p.village ?? '',
          latitude: p.latitude != null ? String(p.latitude) : '', longitude: p.longitude != null ? String(p.longitude) : '',
        })
      }
      if (f) {
        setField({ area: f.area != null ? String(f.area) : '', soil_type: f.soil_type ?? '', irrigation_type: f.irrigation_type ?? '', water_source: f.water_source ?? '' })
        if (!p?.latitude && f.latitude != null) setProfile(prev => ({ ...prev, latitude: String(f.latitude) }))
        if (!p?.longitude && f.longitude != null) setProfile(prev => ({ ...prev, longitude: String(f.longitude) }))
      }
      if (c) setCrop({ crop: c.crop ?? '', variety: c.variety ?? '', sowing_date: c.sowing_date ?? '', season: c.season ?? '' })
      setLoading(false)
    }
    loadExisting()
    return () => { mounted = false }
  }, [navigate])

  const updateProfile = (key: keyof ProfileData, value: string) => setProfile(prev => ({ ...prev, [key]: value }))
  const updateField = (key: keyof FieldData, value: string) => setField(prev => ({ ...prev, [key]: value }))
  const updateCrop = (key: keyof CropData, value: string) => setCrop(prev => ({ ...prev, [key]: value }))

  const useLocation = () => {
    setError('')
    if (!navigator.geolocation) {
      setError('Location is not available in this browser. Enter latitude and longitude manually.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      position => {
        updateProfile('latitude', position.coords.latitude.toFixed(6))
        updateProfile('longitude', position.coords.longitude.toFixed(6))
        setLocating(false)
        setMessage('Location captured successfully.')
      },
      () => {
        setLocating(false)
        setError('Could not access your location. Please allow location access or enter coordinates manually.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('login-farmer')
      return
    }

    const required = [
      [profile.name, 'Name'], [profile.phone, 'Mobile'], [profile.gender, 'Gender'], [profile.age, 'Age'],
      [profile.state, 'State'], [profile.district, 'District'], [profile.village, 'Village'],
      [profile.latitude, 'Latitude'], [profile.longitude, 'Longitude'], [field.area, 'Total land'],
      [field.soil_type, 'Soil type'], [field.irrigation_type, 'Irrigation type'], [field.water_source, 'Water source'],
      [crop.crop, 'Current crop'], [crop.variety, 'Variety'], [crop.sowing_date, 'Sowing date'], [crop.season, 'Season'],
    ] as const
    const missing = required.find(([value]) => !String(value).trim())
    if (missing) {
      setError(`Please complete ${missing[1]}.`)
      return
    }

    setSaving(true)
    try {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        role: 'FARMER',
        gender: profile.gender,
        age: Number(profile.age),
        state: profile.state.trim(),
        district: profile.district.trim(),
        village: profile.village.trim(),
        latitude: Number(profile.latitude),
        longitude: Number(profile.longitude),
      }, { onConflict: 'id' })
      if (profileError) throw profileError

      const { data: existingField, error: fieldLookupError } = await supabase
        .from('fields').select('id').eq('farmer_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (fieldLookupError) throw fieldLookupError

      let fieldId = existingField?.id as string | undefined
      if (fieldId) {
        const { error } = await supabase.from('fields').update({
          area: Number(field.area), soil_type: field.soil_type, irrigation_type: field.irrigation_type,
          water_source: field.water_source, latitude: Number(profile.latitude), longitude: Number(profile.longitude),
        }).eq('id', fieldId).eq('farmer_id', user.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('fields').insert({
          farmer_id: user.id, area: Number(field.area), soil_type: field.soil_type,
          irrigation_type: field.irrigation_type, water_source: field.water_source,
          latitude: Number(profile.latitude), longitude: Number(profile.longitude),
        }).select('id').single()
        if (error) throw error
        fieldId = data.id
      }

      const { data: existingCrop, error: cropLookupError } = await supabase
        .from('farmer_crops').select('id').eq('farmer_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (cropLookupError) throw cropLookupError

      const cropPayload = {
        farmer_id: user.id, field_id: fieldId, crop: crop.crop.trim(), variety: crop.variety.trim(),
        sowing_date: crop.sowing_date, season: crop.season,
      }
      if (existingCrop?.id) {
        const { error } = await supabase.from('farmer_crops').update(cropPayload).eq('id', existingCrop.id).eq('farmer_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('farmer_crops').insert(cropPayload)
        if (error) throw error
      }

      navigate('farmer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your farmer profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-500">{tx('Loading your farmer profile...', lang)}</p></div>
  }

  return (
    <div className="min-h-full bg-stone-50 flex flex-col">
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <LanguageSwitcher lang={lang} setLang={setLang} compact />
          <button onClick={() => navigate('login-farmer')} className="flex items-center gap-2 text-green-800 hover:text-green-600 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl">AgriSense</span>
          </button>
          <span className="text-xs text-stone-400">{tx('One-time setup', lang)}</span>
        </div>
      </div>

      <main className="flex-1 px-4 py-8 md:py-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-green-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/></svg>
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl md:text-4xl text-green-900 mb-2">{tx('Set up your farmer profile', lang)}</h1>
            <p className="text-stone-500 text-sm md:text-base">{tx('Tell AgriSense about you, your field and your current crop. You only need to do this once.', lang)}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Section number="1" title="Basic Profile" subtitle="Your personal details">
              <div className="grid md:grid-cols-2 gap-4">
                <Input label={tx('Name', lang)} value={profile.name} onChange={v => updateProfile('name', v)} placeholder={tx('Full name', lang)} required />
                <Input label={tx('Mobile', lang)} value={profile.phone} onChange={v => updateProfile('phone', v)} placeholder={tx('10-digit mobile number', lang)} type="tel" required />
                <Select label={tx('Gender', lang)} value={profile.gender} onChange={v => updateProfile('gender', v)} options={['Male', 'Female', 'Other']} required />
                <Input label={tx('Age', lang)} value={profile.age} onChange={v => updateProfile('age', v)} placeholder={tx('Age', lang)} type="number" min="18" max="100" required />
              </div>
            </Section>

            <Section number="2" title="Location" subtitle="Used for local weather, risk and nearby alerts">
              <div className="grid md:grid-cols-3 gap-4">
                <Input label={tx('State', lang)} value={profile.state} onChange={v => updateProfile('state', v)} placeholder={tx('e.g. Gujarat', lang)} required />
                <Input label={tx('District', lang)} value={profile.district} onChange={v => updateProfile('district', v)} placeholder={tx('e.g. Ahmedabad', lang)} required />
                <Input label={tx('Village', lang)} value={profile.village} onChange={v => updateProfile('village', v)} placeholder={tx('Village / locality', lang)} required />
              </div>
              <div className="mt-4 rounded-xl bg-green-50 border border-green-100 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-green-900">{tx('Farm coordinates', lang)}</p>
                    <p className="text-xs text-green-700 mt-0.5">{tx('Allow location access for accurate weather and field risk.', lang)}</p>
                  </div>
                  <button type="button" onClick={useLocation} disabled={locating} className="shrink-0 px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold disabled:opacity-60">
                    {locating ? tx('Getting location...', lang) : tx('Use my current location', lang)}
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-3">
                  <Input label={tx('Latitude', lang)} value={profile.latitude} onChange={v => updateProfile('latitude', v)} placeholder="e.g. 23.0225" type="number" step="any" required />
                  <Input label={tx('Longitude', lang)} value={profile.longitude} onChange={v => updateProfile('longitude', v)} placeholder="e.g. 72.5714" type="number" step="any" required />
                </div>
              </div>
            </Section>

            <Section number="3" title="Field Information" subtitle="Your primary agricultural field">
              <div className="grid md:grid-cols-2 gap-4">
                <Input label={tx('Total land (acres)', lang)} value={field.area} onChange={v => updateField('area', v)} placeholder="e.g. 2.5" type="number" min="0" step="0.01" required />
                <Select label={tx('Soil type', lang)} value={field.soil_type} onChange={v => updateField('soil_type', v)} options={['Loamy', 'Clay', 'Sandy', 'Silty', 'Black soil', 'Red soil', 'Other']} required />
                <Select label={tx('Irrigation type', lang)} value={field.irrigation_type} onChange={v => updateField('irrigation_type', v)} options={['Drip', 'Sprinkler', 'Flood / Surface', 'Rainfed', 'Other']} required />
                <Select label={tx('Water source', lang)} value={field.water_source} onChange={v => updateField('water_source', v)} options={['Borewell', 'Open well', 'Canal', 'River', 'Farm pond', 'Rainwater', 'Other']} required />
              </div>
            </Section>

            <Section number="4" title="Seasonal & Crop Information" subtitle="What you are growing right now">
              <div className="grid md:grid-cols-2 gap-4">
                <Input label={tx('Current crop', lang)} value={crop.crop} onChange={v => updateCrop('crop', v)} placeholder="e.g. Tomato" required />
                <Input label={tx('Variety', lang)} value={crop.variety} onChange={v => updateCrop('variety', v)} placeholder="e.g. Arka Rakshak" required />
                <Input label={tx('Sowing date', lang)} value={crop.sowing_date} onChange={v => updateCrop('sowing_date', v)} type="date" required />
                <Select label={tx('Season', lang)} value={crop.season} onChange={v => updateCrop('season', v)} options={['Kharif', 'Rabi', 'Zaid', 'Summer', 'Winter', 'Year-round']} required />
              </div>
            </Section>

            {message && <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">{message}</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

            <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="font-semibold text-stone-900">{tx('Ready to start?', lang)}</p>
                <p className="text-xs text-stone-500 mt-1">{tx('Your details will personalize risk, alerts, reports and scheme eligibility.', lang)}</p>
              </div>
              <button type="submit" disabled={saving} className="bg-green-700 hover:bg-green-600 text-white font-semibold py-3 px-7 rounded-lg transition-colors disabled:opacity-60">
                {saving ? tx('Saving profile...', lang) : tx('Save & Continue to Dashboard', lang)}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

function Section({ number, title, subtitle, children }: { number: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-8 h-8 shrink-0 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-bold text-sm">{number}</div>
        <div><h2 className="text-lg font-semibold text-stone-900">{title}</h2><p className="text-xs text-stone-500 mt-0.5">{subtitle}</p></div>
      </div>
      {children}
    </section>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text', min, max, step, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; min?: string; max?: string; step?: string; required?: boolean }) {
  return (
    <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">{label}{required && <span className="text-red-500"> *</span>}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={min} max={max} step={step} required={required} className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500" />
    </label>
  )
}

function Select({ label, value, onChange, options, required }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) {
  return (
    <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">{label}{required && <span className="text-red-500"> *</span>}</span>
      <select value={value} onChange={e => onChange(e.target.value)} required={required} className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500">
        <option value="">Select {label.toLowerCase()}</option>{options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}
