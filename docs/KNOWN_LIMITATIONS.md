# حَرِّك | HARRIK — Known Limitations (V1.0)

As specified in the product specification, the following deliberate boundaries apply to V1:

1. **WhatsApp Deep Link:**
   - V1 prepares and opens a WhatsApp conversation directly using the `https://wa.me/` standard.
   - It cannot verify whether the user actually pressed send in their WhatsApp client or whether the message was read, because no WhatsApp Business Cloud API webhook is active in V1.

2. **Phone Calling:**
   - The Call action triggers `tel:`. V1 cannot verify whether a telephony call was answered or duration of the call.

3. **Plate Recognition Hardware:**
   - ANPR cameras, OCR optical plate scanners, and parking gate barriers are out of scope for V1.

4. **Network Connectivity:**
   - Plate lookup requires network access to query the school database; personal owner records are not cached indefinitely offline for privacy reasons.
