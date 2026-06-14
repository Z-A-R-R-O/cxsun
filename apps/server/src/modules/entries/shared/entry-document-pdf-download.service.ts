import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { PrintHtmlPdfService } from './print-html-pdf.service.js'

@Injectable()
export class EntryDocumentPdfDownloadService {
  constructor(@Inject(PrintHtmlPdfService) private readonly printPdf: PrintHtmlPdfService) {}

  async render(printHtml: unknown, documentNo: unknown) {
    const file = await this.printPdf.render(printHtml)
    return {
      file,
      fileName: `${safeFileName(String(documentNo ?? '').trim() || 'document')}.pdf`,
    }
  }
}

function safeFileName(value: string) {
  return value.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'document'
}
