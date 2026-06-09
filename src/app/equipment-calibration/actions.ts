"use server";

import { redirect } from "next/navigation";
import {
  createEquipmentRecord,
  logCalibration,
  type EquipmentType,
  type CalibrationFrequency,
} from "@/lib/supabase/equipment-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";

export async function createEquipmentAction(formData: FormData) {
  const name                = String(formData.get("name") ?? "").trim();
  const equipmentType       = String(formData.get("equipmentType") ?? "other") as EquipmentType;
  const calibrationFrequency = String(formData.get("calibrationFrequency") ?? "annual") as CalibrationFrequency;
  const location            = String(formData.get("location") ?? "").trim() || null;
  const department          = String(formData.get("department") ?? "").trim() || null;
  const serialNumber        = String(formData.get("serialNumber") ?? "").trim() || null;
  const manufacturer        = String(formData.get("manufacturer") ?? "").trim() || null;
  const lastCalibrated      = String(formData.get("lastCalibrated") ?? "").trim() || null;
  const notes               = String(formData.get("notes") ?? "").trim() || null;

  if (!name) redirect(authMessage("/equipment-calibration", "Equipment name is required."));

  const result = await createEquipmentRecord({
    name,
    equipmentType,
    calibrationFrequency,
    location,
    department,
    serialNumber,
    manufacturer,
    lastCalibrated,
    notes,
  });

  redirect(
    result.ok
      ? authSuccess("/equipment-calibration", result.message)
      : authMessage("/equipment-calibration", result.message)
  );
}

export async function logCalibrationAction(formData: FormData) {
  const id              = String(formData.get("id") ?? "").trim();
  const calibratedDate  = String(formData.get("calibratedDate") ?? "").trim();

  if (!id || !calibratedDate) redirect("/equipment-calibration");

  const result = await logCalibration(id, calibratedDate);
  redirect(
    result.ok
      ? authSuccess("/equipment-calibration", result.message)
      : authMessage("/equipment-calibration", result.message)
  );
}
