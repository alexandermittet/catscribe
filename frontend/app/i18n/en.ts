import { TranslationKey } from './da';

export const en: TranslationKey = {
  // Common
  common: {
    cancel: "Cancel",
    close: "Close",
    email: "Email",
    emailAddress: "Email Address",
    emailPlaceholder: "your@email.com",
    loading: "Loading...",
    processing: "Processing...",
    success: "Success!",
  },

  // Metadata
  meta: {
    title: "catscribe - Audio Transcription Service",
    description: "Cute cat that transcribes your audio files in almost any language",
  },

  // Main page
  page: {
    title: "catscribe",
    subtitle: "Cute cat that takes your interview tapes and transcribes them in (almost) any language",
    note: "note: cat doesn't have the best hearing when far away, for best results, keep your recorder close to the person speaking, so cat can hear what's being said loud and clear",
  },

  // Language names
  languages: {
    autoDetect: "🌐 Auto-detect",
    // Scandinavian
    danish: "🇩🇰 Danish",
    norwegian: "🇳🇴 Norwegian",
    swedish: "🇸🇪 Swedish",
    icelandic: "🇮🇸 Icelandic",
    finnish: "🇫🇮 Finnish",
    // Priority
    english: "🇬🇧 English",
    ukrainian: "🇺🇦 Ukrainian",
    // All others
    afrikaans: "🇿🇦 Afrikaans",
    arabic: "🇸🇦 Arabic",
    armenian: "🇦🇲 Armenian",
    azerbaijani: "🇦🇿 Azerbaijani",
    belarusian: "🇧🇾 Belarusian",
    bosnian: "🇧🇦 Bosnian",
    bulgarian: "🇧🇬 Bulgarian",
    catalan: "🇪🇸 Catalan",
    chinese: "🇨🇳 Chinese",
    croatian: "🇭🇷 Croatian",
    czech: "🇨🇿 Czech",
    dutch: "🇳🇱 Dutch",
    estonian: "🇪🇪 Estonian",
    french: "🇫🇷 French",
    galician: "🇪🇸 Galician",
    german: "🇩🇪 German",
    greek: "🇬🇷 Greek",
    hebrew: "🇮🇱 Hebrew",
    hindi: "🇮🇳 Hindi",
    hungarian: "🇭🇺 Hungarian",
    indonesian: "🇮🇩 Indonesian",
    italian: "🇮🇹 Italian",
    japanese: "🇯🇵 Japanese",
    kannada: "🇮🇳 Kannada",
    kazakh: "🇰🇿 Kazakh",
    korean: "🇰🇷 Korean",
    latvian: "🇱🇻 Latvian",
    lithuanian: "🇱🇹 Lithuanian",
    macedonian: "🇲🇰 Macedonian",
    malay: "🇲🇾 Malay",
    marathi: "🇮🇳 Marathi",
    maori: "🇳🇿 Maori",
    nepali: "🇳🇵 Nepali",
    persian: "🇮🇷 Persian",
    polish: "🇵🇱 Polish",
    portuguese: "🇵🇹 Portuguese",
    romanian: "🇷🇴 Romanian",
    russian: "🇷🇺 Russian",
    serbian: "🇷🇸 Serbian",
    slovak: "🇸🇰 Slovak",
    slovenian: "🇸🇮 Slovenian",
    spanish: "🇪🇸 Spanish",
    swahili: "🇹🇿 Swahili",
    tagalog: "🇵🇭 Tagalog",
    tamil: "🇮🇳 Tamil",
    thai: "🇹🇭 Thai",
    turkish: "🇹🇷 Turkish",
    urdu: "🇵🇰 Urdu",
    vietnamese: "🇻🇳 Vietnamese",
    welsh: "🇬🇧 Welsh",
  },

  // Models
  models: {
    tiny: "😴 Lazy Cat (~12 min wait time for 1 hr of interview, Lower Quality)",
    base: "🐱 Everyday Cat (~15 min wait time for 1 hr of interview, Balanced)",
    small: "📚 Studious Cat (~20 min wait time for 1 hr of interview, Better Quality)",
    medium: "🎯 Perfectionistic Cat (~40 min wait time for 1 hr of interview, High Quality)",
    large: "💪 Hyperpolyglot Gigachad Cat (~2 hrs wait time for 1 hr of interview, Best Quality)",
    comingSoon: "(coming soon™️..)",
    limitReached: "(Limit reached)",
  },

  // Usage section
  usage: {
    loadingAccount: "Loading account information...",
    freeCat: "Free Cat",
    premiumCat: "Premium Cat",
    buyPremiumMinutes: "Buy premium minutes",
    freeMinutesRemaining: "Free minutes remaining:",
    premiumMinutesRemaining: "Premium minutes remaining:",
    minutes: "Minutes:",
    alreadyBought: "Already bought minutes and not showing? click here",
  },

  // File upload
  fileUpload: {
    dragAndDrop: "Drag and drop your audio file",
    dropHere: "Drop your audio file here",
    orClickToBrowse: "or click to browse",
    supports: "Supports: MP3, WAV, M4A, OGG, FLAC, WEBM",
    selected: "Selected:",
  },

  // Form
  form: {
    language: "Language",
    modelQuality: "Model Quality",
    startTranscription: "Start Transcription",
    transcribing: "Transcribing...",
    pleaseSelectFile: "Please select a file",
    insufficientMinutes: "Insufficient minutes",
    freeTierLimitReached: "Free tier limit reached for this model",
  },

  // Transcription status
  status: {
    queued: "Queued for processing...",
    processing: "Transcribing audio...",
    completed: "Transcription completed!",
    failed: "Transcription failed",
    complete: "complete",
    elapsedTime: "Elapsed time",
    timeRemaining: "Time remaining",
  },

  // Results
  results: {
    title: "Transcription Result",
    downloadTxt: "Download TXT",
    downloadSrt: "Download SRT",
    downloadVtt: "Download VTT",
    language: "Language:",
    duration: "Duration:",
    minutes: "minutes",
  },

  // Checkout modal
  checkout: {
    title: "Purchase Minutes",
    emailLabel: "Email Address",
    packageLabel: "Minutes Package",
    continueToPayment: "Continue to Payment",
    minutesPackage: "Minutes",
    errorInvalidEmail: "Please enter a valid email address",
    errorCreateSession: "Failed to create checkout session",
  },

  // Claim modals
  claim: {
    creditsTitle: "Claim Your Credits",
    minutesTitle: "Claim Your Minutes",
    description: "Enter the email address you used to purchase {type}. Your {type} will be linked to this device.",
    credits: "credits",
    minutes: "minutes",
    claimButton: "Claim {type}",
    claiming: "Claiming...",
    successMessage: "{type} claimed successfully! Reloading...",
    errorInvalidEmail: "Please enter a valid email address",
    errorClaimFailed: "Failed to claim {type}",
  },

  // Footer
  footer: {
    allRightsReserved: "All rights reserved.",
    designedBy: "Designed by Alexander Mittet",
    catDrawingBy: "Cat drawing by:",
  },

  // Language switcher
  languageSwitcher: {
    da: "🇩🇰 DA",
    en: "🇬🇧 EN",
  },

  // Font toggle
  fontToggle: {
    label: "Barbie font",
    toggle: "Toggle font",
    enable: "Enable Barbie font",
    disable: "Disable Barbie font",
  },

  // Errors
  errors: {
    transcriptionFailed: "Failed to start transcription",
    loadUsageDataFailed: "Failed to load usage data",
  },

  // Pending jobs notification
  pendingJobs: {
    title: "Pending Transcriptions",
    description: "You have ongoing or completed transcriptions from a previous session:",
  },
};
