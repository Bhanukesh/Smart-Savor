-- CreateEnum
CREATE TYPE "LabReportParseStatus" AS ENUM ('pending', 'parsed', 'failed');

-- CreateTable
CREATE TABLE "lab_reports" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "s3_key" TEXT NOT NULL,
    "parse_status" "LabReportParseStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_report_findings" (
    "id" UUID NOT NULL,
    "lab_report_id" UUID NOT NULL,
    "nutrient" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "current_value" DECIMAL(10,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "confirmed" BOOLEAN,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_report_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lab_reports_patient_id_upload_date_idx" ON "lab_reports"("patient_id", "upload_date");

-- CreateIndex
CREATE INDEX "lab_report_findings_lab_report_id_idx" ON "lab_report_findings"("lab_report_id");

-- AddForeignKey
ALTER TABLE "lab_reports" ADD CONSTRAINT "lab_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_report_findings" ADD CONSTRAINT "lab_report_findings_lab_report_id_fkey" FOREIGN KEY ("lab_report_id") REFERENCES "lab_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
