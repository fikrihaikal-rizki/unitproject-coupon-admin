<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { QrcodeStream } from "vue-qrcode-reader";
import { isAfter, parseISO, format, isWithinInterval, isSameDay } from "date-fns";
import { useStorage } from "@vueuse/core";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Lock,
  User,
  CreditCard,
  Scan,
  RefreshCcw,
  History,
  QrCode,
  ChevronLeft,
  LogOut,
} from "lucide-vue-next";
import { toast } from "vue-sonner";

// State
const authStore = useAdminAuthStore();
const { user } = storeToRefs(authStore);
const lockedCouponId = useStorage<string | null>("lockedCouponId", null);
const coupons = ref<any[]>([]);
const isLoading = ref(true);
const isScanning = ref(true);
const lastScannedData = ref<string | null>(null);

// Popups State
const showSuccessPopup = ref(false);
const showExpiredPopup = ref(false);
const showIntegrityPopup = ref(false);
const showMismatchPopup = ref(false);
const showAlreadyRedeemedPopup = ref(false);

const redemptionData = ref<any>(null);
const errorData = ref<any>(null);
const scannedCouponInfo = ref<any>(null);

// Audio/Haptic Utilities
const playBeep = () => {
  try {
    const audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.warn("Audio beep failed", e);
  }
};

const triggerErrorHaptic = () => {
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
};

// Data Fetching
const fetchCoupons = async () => {
  try {
    const response = await $fetch<{ data: any[] }>("/api/operator/coupons");
    coupons.value = response.data;
  } catch (error) {
    toast.error("Failed to fetch coupons");
  } finally {
    isLoading.value = false;
  }
};

const sortedCoupons = computed(() => {
  const now = new Date();
  return [...coupons.value].sort((a, b) => {
    const aFrom = new Date(a.redeemFrom);
    const aUntil = new Date(a.redeemUntil);
    const bFrom = new Date(b.redeemFrom);
    const bUntil = new Date(b.redeemUntil);

    const aActive = isWithinInterval(now, { start: aFrom, end: aUntil });
    const bActive = isWithinInterval(now, { start: bFrom, end: bUntil });

    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    
    // Fallback to redeemFrom order
    return aFrom.getTime() - bFrom.getTime();
  });
});

const lockedCoupon = computed(() =>
  coupons.value.find((c) => String(c.id) === lockedCouponId.value),
);

// Main Scanning Logic
const onDetect = async (detectedCodes: any[]) => {
  if (!isScanning.value || detectedCodes.length === 0) return;

  const qrData = detectedCodes[0].rawValue;
  if (lastScannedData.value === qrData) return;

  lastScannedData.value = qrData;
  isScanning.value = false;

  console.log({"QR Data:": qrData, "isScanning:": isScanning.value});

  try {
    // 1. Initial Validation Scan (Dry Run)
    const info = await $fetch<any>("/api/operator/redeem", {
      method: "PATCH",
      body: { qrData, checkOnly: true },
    });

    if (!info.success) {
      throw new Error(info.message || "Validation failed");
    }

    scannedCouponInfo.value = info;

    // A. Expiry Check
    const now = new Date();
    const redeemUntil = parseISO(info.redeemUntil);
    if (isAfter(now, redeemUntil)) {
      errorData.value = {
        message: `Coupon Expired! This coupon reached its deadline on ${format(redeemUntil, "PPp")}.`,
        redeemUntil: info.redeemUntil,
      };
      triggerErrorHaptic();
      showExpiredPopup.value = true;
      return;
    }

    // B. First-Scan & Lock Logic
    if (lockedCouponId.value === null) {
      showIntegrityPopup.value = true;
      return;
    }

    if (lockedCouponId.value !== String(info.couponId)) {
      errorData.value = {
        lockedName: lockedCoupon.value?.name,
        scannedName: info.couponName,
      };
      triggerErrorHaptic();
      showMismatchPopup.value = true;
      return;
    }

    // C. Redemption Process
    // Check if already redeemed from the info first
    if (info.isRedeemed) {
      errorData.value = info;
      triggerErrorHaptic();
      showAlreadyRedeemedPopup.value = true;
      return;
    }

    // All checks passed, perform actual redemption
    await performRedemption(qrData);
  } catch (error: any) {
    const msg = error.data?.statusMessage || error.message;
    toast.error(msg);
    resetScanner();
  }
};

const performRedemption = async (qrData: string) => {
  try {
    const response = await $fetch<any>("/api/operator/redeem", {
      method: "PATCH",
      body: { qrData },
    });

    if (response.success) {
      redemptionData.value = response.data;
      playBeep();
      showSuccessPopup.value = true;
    } else if (response.alreadyRedeemed) {
      errorData.value = response;
      triggerErrorHaptic();
      showAlreadyRedeemedPopup.value = true;
    }
  } catch (error: any) {
    const msg = error.data?.statusMessage || error.message;
    toast.error(msg);
    resetScanner();
  }
};

const lockToScanned = async () => {
  if (scannedCouponInfo.value) {
    lockedCouponId.value = String(scannedCouponInfo.value.couponId);
    showIntegrityPopup.value = false;
    // Continue redemption after locking
    await performRedemption(lastScannedData.value!);
  }
};

const toggleLock = (id: string) => {
  if (lockedCouponId.value === id) {
    lockedCouponId.value = null;
  } else {
    lockedCouponId.value = id;
  }
};

const resetScanner = () => {
  isScanning.value = true;
  lastScannedData.value = null;
  showSuccessPopup.value = false;
  showExpiredPopup.value = false;
  showAlreadyRedeemedPopup.value = false;
  showIntegrityPopup.value = false;
  showMismatchPopup.value = false;
};

onMounted(() => {
  fetchCoupons();
});

function handleLogout() {
  authStore.logout();
}
</script>

<template>
  <div class="max-w-md mx-auto space-y-6 pb-32">
    <!-- Header -->
    <div class="flex items-center justify-between px-2 pt-5">
      <div class="flex items-center overflow-hidden pl-1 gap-2">
        <!-- Back Button (Visible only for Admin) -->
        <Button
          v-if="user?.role === 'admin'"
          variant="ghost"
          size="icon"
          as-child
          class="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-900 shrink-0"
        >
          <NuxtLink to="/admin">
            <ChevronLeft class="h-6 w-6" />
          </NuxtLink>
        </Button>

        <div class="flex items-center min-w-0 gap-2">
          <QrCode class="w-8 h-8" />
          <div class="min-w-0">
            <h2
              class="text-2xl font-black text-slate-900 tracking-tight truncate"
            >
              Scan & Redeem
            </h2>
            <p class="text-xs text-slate-500 font-medium truncate">
              Redeem customer coupons
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center">
        <div
          v-if="lockedCouponId"
          class="hidden sm:block animate-in fade-in zoom-in duration-300"
        >
          <Badge
            variant="default"
            class="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <Lock class="w-3 h-3" />
            {{ lockedCoupon?.name }}
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="icon"
          @click="handleLogout"
          class="h-10 w-10 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
        >
          <LogOut class="h-5 w-5" />
        </Button>
      </div>
    </div>

    <!-- Scanner Section -->
    <Card
      class="overflow-hidden border-2 border-slate-200 relative group shadow-xl bg-slate-950"
    >
      <div class="aspect-square relative flex items-center justify-center">
        <!-- Scanning Effect Overlay -->
        <div
          v-if="isScanning"
          class="absolute inset-0 z-10 pointer-events-none border-[30px] border-black/40"
        >
          <div
            class="w-full h-full border-2 border-indigo-400/50 rounded-sm relative"
          >
            <div
              class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500"
            />
            <div
              class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500"
            />
            <div
              class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500"
            />
            <div
              class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500"
            />
            <div
              class="absolute top-0 left-0 w-full h-0.5 bg-indigo-500/50 animate-scan shadow-[0_0_15px_indigo]"
            />
          </div>
        </div>

        <QrcodeStream 
          v-if="isScanning" 
          @detect="onDetect"
          class="w-full h-full object-cover grayscale-[0.5] contrast-125"
        />

        <div
          v-else
          class="flex flex-col items-center justify-center h-full text-white bg-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div class="text-center p-8 space-y-6">
            <div v-if="showSuccessPopup" class="space-y-4">
              <div
                class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-500/10"
              >
                <CheckCircle2 class="w-12 h-12 text-green-400" />
              </div>
              <p class="text-xl font-bold text-green-400">
                Redemption Successful!
              </p>
            </div>

            <div v-else-if="showExpiredPopup" class="space-y-1">
              <XCircle class="w-16 h-16 text-red-500 mx-auto mb-2" />
              <p class="font-bold text-red-400">Coupon Expired!</p>
            </div>

            <div v-else-if="showAlreadyRedeemedPopup" class="space-y-1">
              <AlertTriangle class="w-16 h-16 text-yellow-500 mx-auto mb-2" />
              <p class="font-bold text-yellow-500">Already Redeemed</p>
            </div>

            <div v-else-if="showMismatchPopup" class="space-y-1">
              <AlertTriangle class="w-16 h-16 text-orange-500 mx-auto mb-2" />
              <p class="font-bold text-orange-500">Locked Mismatch</p>
            </div>

            <Button
              @click="resetScanner"
              class="bg-white text-slate-900 hover:bg-slate-100 font-bold px-8 h-12 rounded-full shadow-lg"
            >
              <RefreshCcw class="w-4 h-4 mr-2" />
              Scan Next
            </Button>
          </div>
        </div>
      </div>

      <!-- Footer Info during scan -->
      <div v-if="isScanning" class="absolute bottom-4 left-0 w-full px-6 z-20">
        <div
          class="bg-black/60 backdrop-blur-md rounded-lg p-2 flex items-center justify-center gap-2 border border-white/10"
        >
          <Scan class="w-4 h-4 text-indigo-400" />
          <span class="text-xs font-bold text-white uppercase tracking-widest"
            >Align QR Code to center</span
          >
        </div>
      </div>
    </Card>

    <!-- Coupon Locking Hub -->
    <div class="space-y-4">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <ShieldCheck class="w-4 h-4 text-slate-400" />
          <span
            class="text-xs font-bold text-slate-400 uppercase tracking-widest"
            >Data Integrity Lock</span
          >
        </div>
        <button
          @click="lockedCouponId = null"
          v-if="lockedCouponId"
          class="text-xs font-bold text-red-500 hover:underline"
        >
          Clear Lock
        </button>
      </div>

      <div class="grid gap-3">
        <Card
          v-for="coupon in sortedCoupons"
          :key="coupon.id"
          @click="toggleLock(String(coupon.id))"
          :class="[
            'p-4 transition-all duration-300 border-2 cursor-pointer relative overflow-hidden',
            lockedCouponId === String(coupon.id)
              ? 'border-indigo-600 bg-indigo-50/30'
              : 'border-slate-200 hover:border-slate-300',
          ]"
        >
          <!-- Active Indicator -->
          <div
            v-if="lockedCouponId === String(coupon.id)"
            class="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-bl-xl shadow-md"
          >
            <Lock class="w-3.5 h-3.5" />
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div
                :class="[
                  'w-10 h-10 rounded-xl flex items-center justify-center shadow-sm',
                  lockedCouponId === String(coupon.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-400',
                ]"
              >
                <CreditCard class="w-5 h-5" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <p class="font-black text-slate-900 leading-none text-lg truncate">
                    {{ coupon.name }}
                  </p>
                  <!-- Upcoming Badge -->
                  <Badge 
                    v-if="!isWithinInterval(new Date(), { start: new Date(coupon.redeemFrom), end: new Date(coupon.redeemUntil) }) && isSameDay(new Date(), new Date(coupon.redeemFrom))"
                    variant="outline" 
                    class="bg-amber-50 text-amber-600 border-amber-200 text-[10px] uppercase font-bold px-2 py-0 h-5"
                  >
                    Upcoming
                  </Badge>
                </div>
                <p class="text-xs font-bold text-slate-400 uppercase truncate">
                  {{ coupon.event?.title }}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div
        v-if="!sortedCoupons.length && !isLoading"
        class="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200"
      >
        <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Scan class="w-8 h-8 text-slate-200" />
        </div>
        <h3 class="text-slate-900 font-black mb-1">No Redeems Today</h3>
        <p class="text-sm font-medium text-slate-400 max-w-[200px] mx-auto">There are no coupons available for redemption today.</p>
      </div>
    </div>

    <!-- Modals -->
    <!-- Success Modal -->
    <Dialog :open="showSuccessPopup" @update:open="(v) => !v && resetScanner()">
      <DialogContent
        class="sm:max-w-md bg-white p-0 overflow-hidden border-none shadow-2xl"
      >
        <div class="h-2 bg-green-500 w-full" />
        <div class="p-8 text-center">
          <div
            class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 class="w-10 h-10 text-green-600" />
          </div>
          <h2 class="text-2xl font-black text-slate-900 mb-2 leading-tight">
            Redemption Successful!
          </h2>
          <p class="text-slate-500 font-medium mb-8">
            The customer's coupon is now marked as redeemed.
          </p>

          <div
            v-if="redemptionData"
            class="text-left bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4 mb-8"
          >
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100"
              >
                <User class="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <p
                  class="text-xs font-bold text-slate-400 uppercase leading-none mb-1"
                >
                  Customer
                </p>
                <p class="text-lg font-black text-slate-900 leading-none">
                  {{ redemptionData.customerName }}
                </p>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div
                  class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100"
                >
                  <CreditCard class="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p
                    class="text-xs font-bold text-slate-400 uppercase leading-none mb-1"
                  >
                    Coupon Type
                  </p>
                  <p class="text-lg font-black text-slate-900 leading-none">
                    {{ redemptionData.couponName }}
                  </p>
                </div>
              </div>
              <div
                v-if="redemptionData.claimSeatValue"
                class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-center min-w-[60px]"
              >
                <p class="text-[10px] font-black uppercase leading-none mb-1">
                  Seat
                </p>
                <p class="text-base font-black leading-none">
                  {{ redemptionData.claimSeatValue }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="flex items-center justify-center gap-2 text-slate-400 mb-8"
          >
            <History class="w-4 h-4" />
            <span class="text-xs font-bold uppercase tracking-widest"
              >Time:
              {{
                redemptionData?.redeemedAt
                  ? format(new Date(redemptionData.redeemedAt), "PPp")
                  : "N/A"
              }}</span
            >
          </div>

          <Button
            @click="resetScanner"
            class="w-full h-14 rounded-2xl text-lg font-black bg-indigo-600 hover:bg-indigo-700 shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)]"
          >
            Scan Next Coupon
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Already Redeemed Modal -->
    <Dialog
      :open="showAlreadyRedeemedPopup"
      @update:open="(v) => !v && resetScanner()"
    >
      <DialogContent
        class="sm:max-w-md bg-white p-0 overflow-hidden border-none shadow-2xl"
      >
        <div class="h-2 bg-yellow-400 w-full" />
        <div class="p-8 text-center">
          <div
            class="w-20 h-20 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-6"
          >
            <AlertTriangle class="w-10 h-10 text-yellow-500" />
          </div>
          <h2 class="text-xl font-black text-slate-900 mb-2 leading-tight">
            Warning: Coupon Already Redeemed!
          </h2>

          <div v-if="errorData" class="mb-8">
            <div
              class="bg-amber-50 rounded-2xl p-4 border border-amber-100 text-sm font-medium text-amber-900"
            >
              Redeemed on
              {{
                errorData.redeemedAt
                  ? format(new Date(errorData.redeemedAt), "PPp")
                  : "Unknown"
              }}
              <div
                v-if="errorData.redeemedBy"
                class="mt-1 font-black text-xs uppercase tracking-wider opacity-60"
              >
                By Operator: {{ errorData.redeemedBy }}
              </div>
            </div>
          </div>

          <Button
            @click="resetScanner"
            variant="outline"
            class="w-full h-12 rounded-xl font-bold border-2 border-slate-200"
            >Dismiss</Button
          >
        </div>
      </DialogContent>
    </Dialog>

    <!-- Expired Modal -->
    <Dialog :open="showExpiredPopup" @update:open="(v) => !v && resetScanner()">
      <DialogContent
        class="sm:max-w-md bg-white p-0 overflow-hidden border-none shadow-2xl"
      >
        <div class="h-2 bg-red-500 w-full" />
        <div class="p-8 text-center">
          <div
            class="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6"
          >
            <XCircle class="w-10 h-10 text-red-600" />
          </div>
          <h2 class="text-2xl font-black text-red-600 mb-2 leading-tight">
            Coupon Expired!
          </h2>
          <p class="text-slate-500 font-medium mb-8" v-if="errorData">
            {{ errorData.message }}
          </p>
          <Button
            @click="resetScanner"
            variant="destructive"
            class="w-full h-12 rounded-xl font-bold bg-red-600 shadow-lg shadow-red-200"
            >Dismiss</Button
          >
        </div>
      </DialogContent>
    </Dialog>

    <!-- Integrity Popup -->
    <Dialog
      :open="showIntegrityPopup"
      @update:open="(v) => !v && resetScanner()"
    >
      <DialogContent
        class="sm:max-w-md bg-white p-0 overflow-hidden border-none shadow-2xl"
      >
        <div class="h-2 bg-blue-500 w-full" />
        <div class="p-8 text-center">
          <div
            class="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6"
          >
            <ShieldCheck class="w-10 h-10 text-blue-600" />
          </div>
          <h2 class="text-xl font-black text-slate-900 mb-2 leading-tight">
            System Security Policy
          </h2>
          <p class="text-slate-500 font-medium mb-8">
            Please lock to a specific coupon type for this session to ensure
            data integrity. This prevents accidental redemption of wrong
            categories.
          </p>

          <div
            v-if="scannedCouponInfo"
            class="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4"
          >
            <div
              class="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm"
            >
              <CreditCard class="w-5 h-5" />
            </div>
            <div class="text-left font-black text-slate-900">
              <p
                class="text-[10px] text-slate-400 uppercase tracking-widest leading-none mb-1"
              >
                Scanned Item
              </p>
              <p class="text-base truncate">
                {{ scannedCouponInfo.couponName }}
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <Button
              @click="lockToScanned"
              class="w-full h-14 rounded-2xl text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100"
            >
              Lock to this Coupon Type
            </Button>
            <Button
              @click="resetScanner"
              variant="ghost"
              class="w-full h-12 rounded-xl font-bold text-slate-400"
              >Dismiss</Button
            >
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Mismatch Modal -->
    <Dialog
      :open="showMismatchPopup"
      @update:open="(v) => !v && resetScanner()"
    >
      <DialogContent
        class="sm:max-w-md bg-white p-0 overflow-hidden border-none shadow-2xl"
      >
        <div class="h-2 bg-orange-500 w-full" />
        <div class="p-8 text-center">
          <div
            class="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-6"
          >
            <AlertTriangle class="w-10 h-10 text-orange-600" />
          </div>
          <h2 class="text-2xl font-black text-orange-600 mb-2 leading-tight">
            Mismatch!
          </h2>
          <div v-if="errorData" class="space-y-4 mb-8">
            <p class="text-slate-500 font-medium leading-relaxed">
              This scanner is currently locked to <br />
              <span
                class="text-slate-900 font-black px-2 py-0.5 bg-slate-100 rounded-md"
                >{{ errorData.lockedName }}</span
              >
            </p>
            <p class="text-slate-500 font-medium leading-relaxed">
              However, you just scanned <br />
              <span
                class="text-orange-600 font-black px-2 py-0.5 bg-orange-50 rounded-md"
                >{{ errorData.scannedName }}</span
              >
            </p>
          </div>
          <Button
            @click="resetScanner"
            variant="outline"
            class="w-full h-12 rounded-xl font-bold border-2 border-slate-200"
            >Dismiss</Button
          >
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
@keyframes scan {
  from {
    top: 0;
  }
  to {
    top: 100%;
  }
}

.animate-scan {
  animation: scan 3s linear infinite;
}
</style>
