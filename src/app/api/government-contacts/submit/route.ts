import { NextRequest, NextResponse } from 'next/server'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { isValidIndianPhoneNumber } from '@/lib/government-contacts'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      designation,
      category,
      phoneNumber,
      village,
      mandal,
      officeAddress,
      requestType,
      notes,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'అధికారి లేదా నాయకుడి పేరు తప్పనిసరి (కనీసం 2 అక్షరాలు).' },
        { status: 400 }
      )
    }

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: 'చెల్లుబాటు అయ్యే ఫోన్ నంబర్ తప్పనిసరి.' },
        { status: 400 }
      )
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length < 3 || cleanPhone.length > 13) {
      return NextResponse.json(
        { success: false, error: 'చెల్లుబాటు అయ్యే ఫోన్ నంబర్‌ను నమోదు చేయండి.' },
        { status: 400 }
      )
    }

    const store = loadStore()
    if (!store.governmentContacts) {
      store.governmentContacts = []
    }

    const formattedPhone = cleanPhone.length === 10
      ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`
      : phoneNumber.trim()

    const newSubmissionId = `govt_sub_${Date.now()}`
    const submissionRecord: any = {
      id: newSubmissionId,
      name: name.trim(),
      designation: (designation || 'అధికారి / ప్రతినిధి').trim(),
      department: (designation || category || 'ప్రభుత్వ సేవలు').trim(),
      category: category || 'other_public_services',
      phoneNumber: formattedPhone,
      mandal: mandal ? mandal.trim() : 'Choutuppal',
      village: village ? village.trim() : 'Choutuppal',
      officeAddress: officeAddress ? officeAddress.trim() : undefined,
      status: 'pending', // Requires admin verification
      isPublicContact: false, // Withheld from public until admin approves
      isEmergency: false,
      territoryId: FLAGSHIP_TERRITORY_ID,
      verifiedByRole: 'PUBLIC_SUBMISSION',
      verificationNotes: `Public submission [${requestType || 'new_contact'}]: ${notes || 'Submitted via website form'}. Submitter Phone: ${cleanPhone}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    store.governmentContacts.push(submissionRecord)

    // Also add to admin activity/notifications if messages array exists
    if (Array.isArray(store.messages)) {
      store.messages.unshift({
        id: `msg_sub_${Date.now()}`,
        phone: cleanPhone,
        contactName: name.trim(),
        direction: 'inbound',
        messageText: `[గవర్నమెంట్ కాంటాక్ట్ సబ్మిషన్] ${name.trim()} (${designation || 'అధికారి'}) - ఫోన్: ${formattedPhone}. రిక్వెస్ట్ రకం: ${requestType || 'new_contact'}`,
        status: 'received',
        territoryId: FLAGSHIP_TERRITORY_ID,
        createdAt: new Date().toISOString(),
      })
    }

    saveStore(store)

    return NextResponse.json({
      success: true,
      message: 'ధన్యవాదాలు! మీ సంప్రదింపు వివరాలు అడ్మిన్ పరిశీలన కోసం విజయవంతంగా సమర్పించబడ్డాయి. ధృవీకరణ పూర్తయిన తర్వాత డైరెక్టరీలో ప్రచురించబడుతుంది.',
      id: newSubmissionId,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'వివరాలు సమర్పించడంలో లోపం ఏర్పడింది. దయచేసి మళ్ళీ ప్రయత్నించండి.' },
      { status: 500 }
    )
  }
}
