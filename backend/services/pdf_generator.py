"""
Me'morAI — Texnik Ekspertiza Xulosasi PDF Generatori
O'zbekiston Respublikasi Qurilish Vazirligi (mc.uz) ShNQ va QMQ talablari asosida
QR-kodli, raqamli muhrli arxitektura texnik xulosasi hujjati (PDF).
"""
import io
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


class PDFReportGenerator:
    """ShNQ/QMQ arxitektura texnik ekspertizasi PDF hujjati generatori."""

    def __init__(self, output_dir: Optional[Path | str] = None):
        self.output_dir = Path(output_dir or "uploads/reports")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_report(
        self,
        check_id: str,
        project_name: str,
        city: str,
        building_type: str,
        check_results: List[Dict[str, Any]],
        summary: Dict[str, Any],
        output_filename: Optional[str] = None,
        source_metadata: Optional[Dict[str, Any]] = None,
    ) -> Path:
        """
        To'liq texnik ekspertiza xulosasi PDF faylini yaratadi.
        """
        if not output_filename:
            output_filename = f"Ekspertiza_Xulosasi_{check_id[:8]}.pdf"

        file_path = self.output_dir / output_filename
        doc = SimpleDocTemplate(
            str(file_path),
            pagesize=A4,
            leftMargin=1.5 * cm,
            rightMargin=1.5 * cm,
            topMargin=1.5 * cm,
            bottomMargin=1.5 * cm,
        )

        styles = getSampleStyleSheet()

        # Shrift va uslublar
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            alignment=1,  # Center
            textColor=colors.HexColor("#0f172a"),
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            alignment=1,
            textColor=colors.HexColor("#475569"),
        )
        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#1e3a8a"),
            spaceBefore=8,
            spaceAfter=4,
        )
        body_style = ParagraphStyle(
            "ReportBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#1e293b"),
        )
        body_bold = ParagraphStyle(
            "ReportBodyBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#0f172a"),
        )

        elements = []

        # 1. BLANK VA SARLAVHA (Toza yuridik format - davlat atributlarisiz)
        is_ru = (summary.get("lang") == "ru")
        if is_ru:
            header_text = """
            <b>СИСТЕМА ИНЖЕНЕРНОГО АНАЛИЗА ME'MORAI</b><br/>
            <b>СПРАВКА ПРОГРАММНОГО ПАРАМЕТРИЧЕСКОГО РАСЧЕТА ПО НОРМАМ КМК / ШНК</b>
            """
            sub_title = "СПРАВОЧНЫЙ ОТЧЕТ СООТВЕТСТВИЯ СТРОИТЕЛЬНЫМ НОРМАМ РЕСПУБЛИКИ УЗБЕКИСТАН"
            doc_type = "<b>ИНЖЕНЕРНАЯ СПРАВКА СООТВЕТСТВИЯ (DATASHEET)</b>"
            status_pass = "<b><font color='#16a34a'>ПАРАМЕТРИЧЕСКИ СООТВЕТСТВУЕТ (PASS)</font></b>"
            status_fail = "<b><font color='#dc2626'>ОБНАРУЖЕНЫ НЕСООТВЕТСТВИЯ (FAIL / REVIEW)</font></b>"
            lbl_doc_num = "Номер расчета:"
            lbl_proj_name = "Название проекта:"
            lbl_address = "Локация:"
            lbl_type = "Тип здания:"
            lbl_date = "Дата расчета:"
            lbl_status = "Результат проверки:"
        else:
            header_text = """
            <b>ME'MORAI MUHANDISLIK TAHLIL PLATFORMASI</b><br/>
            <b>ShNQ VA QMQ ME'YORLARI BO'YICHA DASTURIY PARAMETRIK HISOBLASH MA'LUMOTNOMASI</b>
            """
            sub_title = "O'ZBEKISTON RESPUBLIKASI SHAHARSOZLIK ME'YORLARI (ShNQ / QMQ) BO'YICHA MA'LUMOTNOMA"
            doc_type = "<b>MUHANDISLIK ME'YORIY HISOBLASH MA'LUMOTNOMASI (DATASHEET)</b>"
            status_pass = "<b><font color='#16a34a'>PARAMETRIK MUVOFIQ (PASS)</font></b>"
            status_fail = "<b><font color='#dc2626'>NOMUVOFIQLIKLAR ANIQLANDI (FAIL / REVIEW)</font></b>"
            lbl_doc_num = "Hujjat raqami:"
            lbl_proj_name = "Loyiha nomi:"
            lbl_address = "Qurilish manzili:"
            lbl_type = "Bino toifasi:"
            lbl_date = "Tekshiruv sanasi:"
            lbl_status = "Hisob natijasi:"

        elements.append(Paragraph(header_text, title_style))
        elements.append(Spacer(1, 2 * mm))
        elements.append(Paragraph(sub_title, subtitle_style))
        elements.append(Spacer(1, 2 * mm))
        elements.append(Paragraph(doc_type, ParagraphStyle(
            "BoldTitle", parent=title_style, fontSize=11, textColor=colors.HexColor("#0284c7")
        )))
        elements.append(Spacer(1, 3 * mm))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=10))

        # 2. QR-KOD GENERATSIYASI (Haqiqiylikni tekshirish uchun)
        base_url = os.getenv("BASE_URL", "https://api-memore.62.171.143.55.sslip.io").rstrip("/")
        verify_url = f"{base_url}/api/checks/{check_id}/verify"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=4,
            border=1,
        )
        qr.add_data(verify_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)
        qr_flowable = Image(qr_buffer, width=2.4 * cm, height=2.4 * cm)

        # 3. LOYIHA METADATA JADVALI
        now_str = datetime.now().strftime("%d.%m.%Y, %H:%M")
        status_text = status_pass if summary.get("ekspertiza_ready") else status_fail

        meta_data = [
            [Paragraph(f"<b>{lbl_doc_num}</b>", body_style), Paragraph(f"CALC-{check_id[:8].upper()}-2026", body_bold), qr_flowable],
            [Paragraph(f"<b>{lbl_proj_name}</b>", body_style), Paragraph(project_name, body_bold), ""],
            [Paragraph(f"<b>{lbl_address}</b>", body_style), Paragraph(f"{city} (Seysmik zona: 9 ball)", body_style), ""],
            [Paragraph(f"<b>{lbl_type}</b>", body_style), Paragraph(f"Ko'p qavatli bino ({building_type})", body_style), ""],
            [Paragraph(f"<b>{lbl_date}</b>", body_style), Paragraph(now_str, body_style), ""],
            [Paragraph(f"<b>{lbl_status}</b>", body_style), Paragraph(status_text, body_style), ""],
        ]

        if source_metadata:
            src = source_metadata.get("extraction_source", "user_declared")
            if src == "gemini_vision":
                src_label = "AI Gemini Vision (Chizmadan olingan)"
            elif src == "cad_dxf":
                src_label = "CAD DXF Geometriya (Chizmadan olingan)"
            elif src == "extraction_failed":
                src_label = "<font color='#d97706'>Chizma tahlili muvaffaqiyatsiz (Ko'rik talab etiladi)</font>"
            else:
                src_label = "Foydalanuvchi deklaratsiyasi"

            if source_metadata.get("has_conflicts"):
                src_label += " | <font color='#dc2626'>[Nomuvofiqlik aniqlangan]</font>"

            meta_data.append([
                Paragraph("<b>Ma'lumot manbasi:</b>", body_style),
                Paragraph(src_label, body_style),
                "",
            ])

        meta_table = Table(meta_data, colWidths=[3.5 * cm, 10.5 * cm, 3.5 * cm])
        meta_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("SPAN", (2, 0), (2, -1)),  # QR kodni o'ng ustunda vertikal birlashtirish
            ("ALIGN", (2, 0), (2, -1), "CENTER"),
            ("VALIGN", (2, 0), (2, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 4 * mm))

        # 4. STATISTIKA VA XULOSA BLOKI
        total = summary.get("total_checks", len(check_results))
        passed = summary.get("passed", 0)
        failed = summary.get("failed", 0)
        pass_rate = summary.get("pass_rate_percent", 0)

        stats_data = [
            [
                Paragraph(f"<b>Jami me'yorlar:</b> {total}", body_bold),
                Paragraph(f"<b>Muvofiq:</b> <font color='#16a34a'>{passed} ta</font>", body_bold),
                Paragraph(f"<b>Nomuvofiq:</b> <font color='#dc2626'>{failed} ta</font>", body_bold),
                Paragraph(f"<b>Muvofiqlik:</b> {pass_rate}%", body_bold),
            ]
        ]
        stats_table = Table(stats_data, colWidths=[4.3 * cm, 4.3 * cm, 4.3 * cm, 4.3 * cm])
        stats_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(stats_table)
        elements.append(Spacer(1, 5 * mm))

        # 5. ME'YORLAR JADVALI (ShNQ & QMQ moddama-modda)
        elements.append(Paragraph("<b>QURILISH ME'YORLARI VA QOIDALARI BO'YICHA TAHLIL:</b>", section_heading))

        table_header = [
            Paragraph("<b>№</b>", body_bold),
            Paragraph("<b>Hujjat va Modda</b>", body_bold),
            Paragraph("<b>Me'yoriy Talab</b>", body_bold),
            Paragraph("<b>Loyiha Qiymati</b>", body_bold),
            Paragraph("<b>Talab</b>", body_bold),
            Paragraph("<b>Holat</b>", body_bold),
        ]

        table_rows = [table_header]

        for idx, r in enumerate(check_results[:35], start=1):  # 1-sahifaga qulay sig'ishi uchun
            status_badge = "<font color='#16a34a'><b>MUVOFIQ</b></font>" if r.get("status") == "pass" else "<font color='#dc2626'><b>XATO</b></font>"
            code_str = f"<b>{r.get('code', 'ShNQ')}</b><br/>{r.get('clause', '')}"
            title_str = r.get("title_uz", "")
            actual_str = str(r.get("actual_value", "-"))
            req_str = str(r.get("required_value", "-"))

            table_rows.append([
                Paragraph(str(idx), body_style),
                Paragraph(code_str, body_style),
                Paragraph(title_str, body_style),
                Paragraph(actual_str, body_bold),
                Paragraph(req_str, body_style),
                Paragraph(status_badge, body_style),
            ])

        results_table = Table(
            table_rows,
            colWidths=[0.8 * cm, 3.2 * cm, 6.2 * cm, 2.5 * cm, 2.3 * cm, 2.5 * cm],
            repeatRows=1,
        )
        results_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("ALIGN", (3, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(results_table)
        elements.append(Spacer(1, 6 * mm))

        # 6. YURIDIK JAVOBGARLIKNI CHEKLASH VA ALGORITMIK VERIFIKATSIYA BLOKI
        if is_ru:
            legal_disclaimer = """
            <b>Юридическое уведомление и разграничение ответственности (ГК и Градостроительный кодекс РУз):</b><br/>
            <i>Настоящий расчет сформирован автоматически программным комплексом Me'morAI и носит справочно-консультационный характер. Справка не является официальным экспертным заключением ГУП «Экспертиза градостроительной документации» и не заменяет государственную экспертизу. Полная ответственность за безопасность, конструктивную надежность и соответствие проекта строительным нормам возлагается на Главного инженера проекта (ГИП) и Главного архитектора проекта (ГАП) согласно Градостроительному кодексу Республики Узбекистан.</i>
            """
            stamp_title = "<b>[ АЛГОРИТМИЧЕСКИЙ ХЕШ РАСЧЕТА ]</b>"
            stamp_system = "<b>ME'MORAI PARAMETRIC ENGINE</b>"
            stamp_status = "<font color='#0284c7'><b>СТАТУС: РАСЧЕТ ЗАВЕРШЕН</b></font>"
        else:
            legal_disclaimer = """
            <b>Yuridik Ma'lumotnoma va Javobgarlik Cheklovi (O'zR Shaharsozlik Kodeksi):</b><br/>
            <i>Ushbu ma'lumotnoma Me'morAI dasturiy vositasi orqali avtomatik shakllantirilgan bo'lib, axborot-tahliliy xarakterga ega. Ushbu hujjat davlat shaharsozlik ekspertizasi xulosasi hisoblanmaydi va uning o'rnini bosmaydi. Loyiha xavfsizligi, konstruktiv mustahkamligi va yakuniy me'yoriy muvofiqligi bo'yicha to'liq yuridik javobgarlik O'zbekiston Respublikasi Shaharsozlik kodeksining 37-38 moddalariga muvofiq Bosh loyiha muhandisi (GIP) va Bosh loyiha me'mori (GAP) zimmasida qoladi.</i>
            """
            stamp_title = "<b>[ DASTURIY TEKSHIRUV HESHI ]</b>"
            stamp_system = "<b>ME'MORAI PARAMETRIC ENGINE</b>"
            stamp_status = "<font color='#0284c7'><b>HOLAT: HISOBLASH YAKUNLANDI</b></font>"

        signature_data = [
            [
                Paragraph(legal_disclaimer, body_style),
                Paragraph("""
                {stamp_title}<br/>
                {stamp_system}<br/>
                ID: {check_id_short} • DATE: {date_now}<br/>
                ENGINE: QMQRulesEngine v1.0.0<br/>
                {stamp_status}
                """.format(
                    stamp_title=stamp_title,
                    stamp_system=stamp_system,
                    check_id_short=check_id[:8].upper(),
                    date_now=now_str[:10],
                    stamp_status=stamp_status
                ), ParagraphStyle(
                    "Stamp", parent=body_style, alignment=1, textColor=colors.HexColor("#0f172a")
                ))
            ]
        ]
        sig_table = Table(signature_data, colWidths=[11.0 * cm, 6.5 * cm])
        sig_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (1, 0), (1, -1), 1.0, colors.HexColor("#64748b")),
            ("BACKGROUND", (1, 0), (1, -1), colors.HexColor("#f8fafc")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(KeepTogether(sig_table))

        # PDF hujjatini tuzish
        doc.build(elements)
        return file_path
