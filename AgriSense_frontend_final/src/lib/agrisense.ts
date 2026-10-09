import { supabase } from './supabase'

export const API_BASE_URL = 'http://127.0.0.1:8000'

export type FarmerProfile = {
    id: string
    name: string | null
    phone: string | null
    role: string
    gender: string | null
    age: number | null
    language: string | null
    state: string | null
    district: string | null
    village: string | null
    latitude: number | null
    longitude: number | null
}

export type FarmerField = {
    id: string
    farmer_id: string
    area: number | null
    soil_type: string | null
    irrigation_type: string | null
    water_source: string | null
    latitude: number | null
    longitude: number | null
}

export type FarmerCrop = {
    id: string
    farmer_id: string
    field_id: string
    crop: string | null
    variety: string | null
    sowing_date: string | null
    season: string | null
}

export async function getCurrentUser() {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error) throw error
    return user
}

export async function getCurrentFarmerData() {
    const user = await getCurrentUser()

    if (!user) {
        throw new Error('No logged-in user')
    }

    const [{ data: profile, error: profileError }, { data: fields, error: fieldsError }] =
        await Promise.all([
            supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single(),

            supabase
                .from('fields')
                .select('*')
                .eq('farmer_id', user.id)
                .order('created_at', { ascending: true }),
        ])

    if (profileError) throw profileError
    if (fieldsError) throw fieldsError

    const fieldRows = fields ?? []

    let crops: FarmerCrop[] = []

    if (fieldRows.length > 0) {
        const fieldIds = fieldRows.map((field) => field.id)

        const { data: cropRows, error: cropError } = await supabase
            .from('farmer_crops')
            .select('*')
            .eq('farmer_id', user.id)
            .in('field_id', fieldIds)
            .order('created_at', { ascending: true })

        if (cropError) throw cropError

        crops = cropRows ?? []
    }

    return {
        user,
        profile: profile as FarmerProfile,
        fields: fieldRows as FarmerField[],
        crops,
    }
}

export async function getPrimaryFarmerData() {
    const data = await getCurrentFarmerData()

    const field = data.fields[0] ?? null

    const crop =
        data.crops.find((c) => c.field_id === field?.id) ??
        data.crops[0] ??
        null

    return {
        ...data,
        field,
        crop,
    }
}

export async function analyzeCrop(
    image: File,
    options?: {
        farmerId?: string
        fieldId?: string
        selectedCrop?: string
        scanMode?: 'disease' | 'pest' | 'both'
        latitude?: number | null
        longitude?: number | null
    }
) {
    const form = new FormData()

    form.append('file', image)

    if (options?.farmerId) {
        form.append('farmer_id', options.farmerId)
    }

    if (options?.fieldId) {
        form.append('field_id', options.fieldId)
    }

    if (options?.selectedCrop) {
        form.append('selected_crop', options.selectedCrop)
    }

    form.append('scan_mode', options?.scanMode ?? 'disease')

    if (options?.latitude != null) {
        form.append('latitude', String(options.latitude))
    }

    if (options?.longitude != null) {
        form.append('longitude', String(options.longitude))
    }

    const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: form,
    })

    if (!response.ok) {
        let message = `Analysis failed (${response.status})`

        try {
            const errorData = await response.json()
            message =
                errorData?.detail ||
                errorData?.message ||
                message
        } catch {
            // Keep default error message.
        }

        throw new Error(message)
    }

    return response.json()
}

export async function getFarmerScans(farmerId: string) {
    const { data, error } = await supabase
        .from('crop_scans')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false })

    if (error) throw error

    return data ?? []
}

export async function getFarmerCases(farmerId: string) {
    const { data, error } = await supabase
        .from('cases')
        .select(`
      *,
      crop_scans (
        id,
        crop,
        disease,
        disease_class,
        confidence,
        risk,
        risk_score,
        advisory_title,
        advisory_summary,
        created_at
      )
    `)
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false })

    if (error) throw error

    return data ?? []
}

export async function getCaseUpdates(caseId: string) {
    const { data, error } = await supabase
        .from('case_updates')
        .select(`
      *,
      profiles:sender_id (
        id,
        name,
        role
      )
    `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: true })

    if (error) throw error

    return data ?? []
}

export async function getFollowups(caseId: string) {
    const { data, error } = await supabase
        .from('followups')
        .select(`
      *,
      initial_scan:initial_scan_id (*),
      latest_scan:latest_scan_id (*)
    `)
        .eq('case_id', caseId)
        .order('scheduled_date', { ascending: true })

    if (error) throw error

    return data ?? []
}

export async function createCase(params: {
    farmerId: string
    fieldId?: string | null
    scanId: string
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}) {
    const { data, error } = await supabase
        .from('cases')
        .insert({
            farmer_id: params.farmerId,
            field_id: params.fieldId ?? null,
            scan_id: params.scanId,
            priority: params.priority ?? 'HIGH',
            status: 'PENDING',
        })
        .select()
        .single()

    if (error) throw error

    return data
}

export async function getPendingCases() {
    const { data, error } = await supabase
        .from('cases')
        .select(`
      *,
      profiles:farmer_id (
        id,
        name,
        phone,
        state,
        district,
        village
      ),
      fields:field_id (
        id,
        area,
        soil_type,
        irrigation_type,
        water_source,
        latitude,
        longitude
      ),
      crop_scans:scan_id (
        id,
        crop,
        disease,
        disease_class,
        confidence,
        risk,
        risk_score,
        temperature,
        humidity,
        rainfall,
        pest_count,
        image_filename,
        image_url,
        advisory_title,
        advisory_summary,
        created_at
      )
    `)
        .in('status', ['PENDING', 'UNDER_REVIEW', 'FOLLOW_UP', 'ESCALATED'])
        .order('created_at', { ascending: false })

    if (error) throw error

    return data ?? []
}

export async function claimCase(caseId: string, officerId: string) {
    const { data, error } = await supabase
        .from('cases')
        .update({
            officer_id: officerId,
            status: 'UNDER_REVIEW',
        })
        .eq('id', caseId)
        .select()
        .single()

    if (error) throw error

    return data
}

export async function validateCase(params: {
    caseId: string
    officerId: string
    originalDiagnosis?: string | null
    validatedDiagnosis: string
    validationStatus: 'CONFIRMED' | 'CORRECTED' | 'REJECTED'
    notes?: string
}) {
    const { data: validation, error: validationError } = await supabase
        .from('case_validation')
        .insert({
            case_id: params.caseId,
            officer_id: params.officerId,
            original_diagnosis: params.originalDiagnosis ?? null,
            validated_diagnosis: params.validatedDiagnosis,
            validation_status: params.validationStatus,
            notes: params.notes ?? null,
        })
        .select()
        .single()

    if (validationError) throw validationError

    const nextStatus =
        params.validationStatus === 'REJECTED'
            ? 'RESOLVED'
            : 'GUIDANCE_SENT'

    const { data: updatedCase, error: caseError } = await supabase
        .from('cases')
        .update({
            status: nextStatus,
            officer_id: params.officerId,
        })
        .eq('id', params.caseId)
        .select()
        .single()

    if (caseError) throw caseError

    return {
        validation,
        case: updatedCase,
    }
}

export async function addCaseUpdate(params: {
    caseId: string
    senderId: string
    message?: string
    guidance?: string
}) {
    const { data, error } = await supabase
        .from('case_updates')
        .insert({
            case_id: params.caseId,
            sender_id: params.senderId,
            message: params.message ?? null,
            guidance: params.guidance ?? null,
        })
        .select()
        .single()

    if (error) throw error

    return data
}

export async function createNotification(params: {
    userId: string
    type: string
    title: string
    message: string
    caseId?: string | null
}) {
    const { data, error } = await supabase
        .from('notifications')
        .insert({
            user_id: params.userId,
            type: params.type,
            title: params.title,
            message: params.message,
            case_id: params.caseId ?? null,
        })
        .select()
        .single()

    if (error) throw error

    return data
}

export async function getFarmerNotifications(userId: string) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) throw error

    return data ?? []
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) throw error
}
export type FarmerContext = {
    userId: string
    profile: FarmerProfile
    field: FarmerField | null
    crop: FarmerCrop | null
}

export async function getFarmerContext(): Promise<FarmerContext> {
    const data = await getPrimaryFarmerData()

    if (!data.user) {
        throw new Error('No logged-in farmer')
    }

    return {
        userId: data.user.id,
        profile: data.profile,
        field: data.field,
        crop: data.crop,
    }
}

export async function createOfficerCase(params: {
    farmerId: string
    fieldId?: string | null
    scanId: string
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}) {
    return createCase(params)
}

export function progressionFromScores(
    previousScore: number | null | undefined,
    currentScore: number | null | undefined,
): 'IMPROVING' | 'STABLE' | 'DETERIORATING' {
    if (previousScore == null || currentScore == null) return 'STABLE'

    const previous = Number(previousScore)
    const current = Number(currentScore)

    if (current >= previous + 5) return 'DETERIORATING'
    if (current <= previous - 5) return 'IMPROVING'
    return 'STABLE'
}

export async function createAiFollowup(params: {
    farmerId: string
    fieldId?: string | null
    crop?: string | null
    initialScanId: string
    startDate?: string
}) {
    const { data, error } = await supabase
        .from('ai_followups')
        .insert({
            farmer_id: params.farmerId,
            field_id: params.fieldId ?? null,
            crop: params.crop ?? null,
            initial_scan_id: params.initialScanId,
            scheduled_start: params.startDate ?? new Date().toISOString().slice(0, 10),
            current_day: 1,
            status: 'SCHEDULED',
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function getActiveAiFollowup(farmerId: string) {
    const { data, error } = await supabase
        .from('ai_followups')
        .select('*')
        .eq('farmer_id', farmerId)
        .in('status', ['SCHEDULED', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) throw error
    return data
}

export async function getFollowupScans(followupId: string) {
    const { data, error } = await supabase
        .from('ai_followup_scans')
        .select(`
            *,
            crop_scans (
                id,
                disease,
                disease_class,
                confidence,
                risk,
                risk_score,
                advisory_title,
                advisory_summary,
                created_at
            )
        `)
        .eq('followup_id', followupId)
        .order('day_number', { ascending: true })

    if (error) throw error

    return (data ?? []).map((row: any) => ({
        ...row,
        risk_score: row.crop_scans?.risk_score ?? null,
        risk: row.crop_scans?.risk ?? null,
        disease: row.crop_scans?.disease ?? null,
    }))
}

export async function saveAiFollowupScan(params: {
    followupId: string
    dayNumber: number
    scanId: string
    progression?: 'IMPROVING' | 'STABLE' | 'DETERIORATING'
    notes?: string
}) {
    const { data, error } = await supabase
        .from('ai_followup_scans')
        .upsert(
            {
                followup_id: params.followupId,
                day_number: params.dayNumber,
                scan_id: params.scanId,
                progression: params.progression ?? null,
                notes: params.notes ?? null,
            },
            { onConflict: 'followup_id,day_number' },
        )
        .select()
        .single()

    if (error) throw error
    return data
}

export async function updateAiFollowup(
    id: string,
    patch: {
        current_day?: number
        status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED'
        progression?: 'IMPROVING' | 'STABLE' | 'DETERIORATING'
        notes?: string
        latest_scan_id?: string | null
    },
) {
    // latest_scan_id is accepted by the frontend API for convenience, but the
    // migration intentionally keeps ai_followups minimal and does not store it.
    const { latest_scan_id: _latestScanId, ...dbPatch } = patch

    const { data, error } = await supabase
        .from('ai_followups')
        .update(dbPatch)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}
