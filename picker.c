/*
 * picker.c — Magnifier color picker for Yoki color plugin.
 *
 * Standalone Win32 program. Shows a zoomed pixel grid following the cursor.
 * Click to pick a color, Escape to cancel.
 *
 * Output (stdout): Yoki v2 JSON response.
 *   Success: {"type":"detail","markdown":"...","metadata":[...],"actions":[...]}
 *   Cancel:  {"type":"error","error":"cancelled"}
 *
 * Compile: gcc -O2 -mwindows -o picker.exe picker.c -lgdi32
 *   -mwindows hides the console window.
 *
 * Reads V2Input from stdin (ignored — no query needed for pick mode).
 */

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>

#define MAG_PIXELS  11
#define MAG_ZOOM    14
#define MAG_SIZE    (MAG_PIXELS * MAG_ZOOM + 1)
#define LABEL_H     32
#define WIN_W       MAG_SIZE
#define WIN_H       (MAG_SIZE + LABEL_H)
#define OFFSET      24

static HINSTANCE g_hInst;
static int g_pickR = -1, g_pickG = -1, g_pickB = -1;
static int g_cancelled = 0;
static HFONT g_font = NULL;

/* Forward declarations */
LRESULT CALLBACK MagWndProc(HWND, UINT, WPARAM, LPARAM);
void DrawMagnifier(HWND hwnd, HDC hdc, int cx, int cy);
void OutputResult(void);

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE hPrev, LPSTR cmdLine, int nShow) {
    (void)hPrev; (void)cmdLine; (void)nShow;
    g_hInst = hInst;

    /* Drain stdin (V2Input) so Yoki doesn't hang */
    {
        char buf[4096];
        HANDLE hStdin = GetStdHandle(STD_INPUT_HANDLE);
        DWORD avail = 0;
        if (PeekNamedPipe(hStdin, NULL, 0, NULL, &avail, NULL) && avail > 0) {
            DWORD read;
            ReadFile(hStdin, buf, sizeof(buf)-1, &read, NULL);
        }
    }

    /* Register window class */
    WNDCLASSEXW wc = {0};
    wc.cbSize = sizeof(wc);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = MagWndProc;
    wc.hInstance = hInst;
    wc.hCursor = LoadCursor(NULL, IDC_CROSS);
    wc.lpszClassName = L"YokiPickerMag";
    RegisterClassExW(&wc);

    /* Create topmost layered window */
    HWND hwnd = CreateWindowExW(
        WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | WS_EX_LAYERED,
        L"YokiPickerMag", NULL,
        WS_POPUP | WS_VISIBLE,
        0, 0, WIN_W, WIN_H,
        NULL, NULL, hInst, NULL
    );
    if (!hwnd) {
        printf("{\"type\":\"error\",\"error\":\"failed to create window\"}\n");
        return 1;
    }
    SetLayeredWindowAttributes(hwnd, 0, 245, LWA_ALPHA);

    /* Create font for label */
    g_font = CreateFontW(14, 0, 0, 0, FW_NORMAL, 0, 0, 0,
        DEFAULT_CHARSET, 0, 0, CLEARTYPE_QUALITY, FF_SWISS, L"Segoe UI");

    /* Wait for any existing click to release */
    while (GetAsyncKeyState(VK_LBUTTON) & 0x8000)
        Sleep(30);

    /* Main loop — poll at ~60fps */
    DWORD deadline = GetTickCount() + 60000;
    while (GetTickCount() < deadline) {
        /* Process window messages */
        MSG msg;
        while (PeekMessageW(&msg, NULL, 0, 0, PM_REMOVE)) {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        if (g_cancelled || g_pickR >= 0)
            break;

        /* Escape */
        if (GetAsyncKeyState(VK_ESCAPE) & 0x8000) {
            g_cancelled = 1;
            break;
        }

        POINT pt;
        GetCursorPos(&pt);
        SetCursor(LoadCursor(NULL, IDC_CROSS));

        /* Position near cursor */
        int mx = pt.x + OFFSET;
        int my = pt.y + OFFSET;
        int sw = GetSystemMetrics(SM_CXSCREEN);
        int sh = GetSystemMetrics(SM_CYSCREEN);
        if (mx + WIN_W > sw) mx = pt.x - OFFSET - WIN_W;
        if (my + WIN_H > sh) my = pt.y - OFFSET - WIN_H;
        SetWindowPos(hwnd, NULL, mx, my, WIN_W, WIN_H, SWP_NOACTIVATE | SWP_NOZORDER);

        /* Draw */
        HDC hdc = GetDC(hwnd);
        DrawMagnifier(hwnd, hdc, pt.x, pt.y);
        ReleaseDC(hwnd, hdc);

        /* Click = pick */
        if (GetAsyncKeyState(VK_LBUTTON) & 0x8000) {
            HDC hdcScr = GetDC(NULL);
            COLORREF cr = GetPixel(hdcScr, pt.x, pt.y);
            ReleaseDC(NULL, hdcScr);
            g_pickR = GetRValue(cr);
            g_pickG = GetGValue(cr);
            g_pickB = GetBValue(cr);
            break;
        }

        Sleep(16);
    }

    DestroyWindow(hwnd);
    if (g_font) DeleteObject(g_font);

    OutputResult();
    return 0;
}

LRESULT CALLBACK MagWndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
    return DefWindowProcW(hwnd, msg, wp, lp);
}

void DrawMagnifier(HWND hwnd, HDC hdc, int cx, int cy) {
    HDC hdcScr = GetDC(NULL);
    int half = MAG_PIXELS / 2;

    /* Stretch screen pixels */
    StretchBlt(hdc, 0, 0, MAG_SIZE, MAG_SIZE,
               hdcScr, cx - half, cy - half, MAG_PIXELS, MAG_PIXELS,
               SRCCOPY);

    /* Grid lines */
    HPEN gridPen = CreatePen(PS_SOLID, 1, RGB(68, 68, 68));
    HPEN oldPen = SelectObject(hdc, gridPen);
    for (int i = 0; i <= MAG_PIXELS; i++) {
        int pos = i * MAG_ZOOM;
        MoveToEx(hdc, pos, 0, NULL);
        LineTo(hdc, pos, MAG_SIZE);
        MoveToEx(hdc, 0, pos, NULL);
        LineTo(hdc, MAG_SIZE, pos);
    }
    SelectObject(hdc, oldPen);
    DeleteObject(gridPen);

    /* Center pixel — white highlight */
    int cX = half * MAG_ZOOM;
    int cY = half * MAG_ZOOM;
    HPEN hiPen = CreatePen(PS_SOLID, 2, RGB(255, 255, 255));
    SelectObject(hdc, hiPen);
    MoveToEx(hdc, cX, cY, NULL);
    LineTo(hdc, cX + MAG_ZOOM, cY);
    LineTo(hdc, cX + MAG_ZOOM, cY + MAG_ZOOM);
    LineTo(hdc, cX, cY + MAG_ZOOM);
    LineTo(hdc, cX, cY);
    SelectObject(hdc, oldPen);
    DeleteObject(hiPen);

    /* Get center pixel color */
    COLORREF cr = GetPixel(hdcScr, cx, cy);
    int r = GetRValue(cr), g = GetGValue(cr), b = GetBValue(cr);
    ReleaseDC(NULL, hdcScr);

    /* Label background */
    RECT labelRect = {0, MAG_SIZE, WIN_W, WIN_H};
    HBRUSH bgBrush = CreateSolidBrush(RGB(26, 26, 26));
    FillRect(hdc, &labelRect, bgBrush);
    DeleteObject(bgBrush);

    /* Color swatch */
    RECT swRect = {6, MAG_SIZE + 6, 26, MAG_SIZE + 26};
    HBRUSH swBrush = CreateSolidBrush(RGB(r, g, b));
    FillRect(hdc, &swRect, swBrush);
    DeleteObject(swBrush);

    /* Hex text */
    if (g_font) SelectObject(hdc, g_font);
    SetBkMode(hdc, TRANSPARENT);
    SetTextColor(hdc, RGB(255, 255, 255));

    char hex[16];
    snprintf(hex, sizeof(hex), "#%02X%02X%02X", r, g, b);
    TextOutA(hdc, 32, MAG_SIZE + 8, hex, (int)strlen(hex));

    /* RGB text */
    SetTextColor(hdc, RGB(153, 153, 153));
    char rgb[32];
    snprintf(rgb, sizeof(rgb), "rgb(%d,%d,%d)", r, g, b);
    TextOutA(hdc, WIN_W / 2 + 10, MAG_SIZE + 8, rgb, (int)strlen(rgb));
}

void OutputResult(void) {
    HANDLE hStdout = GetStdHandle(STD_OUTPUT_HANDLE);
    char buf[1024];
    int len;

    if (g_cancelled || g_pickR < 0) {
        len = snprintf(buf, sizeof(buf),
            "{\"type\":\"error\",\"error\":\"cancelled\"}\n");
    } else {
        char hex[16];
        snprintf(hex, sizeof(hex), "#%02X%02X%02X", g_pickR, g_pickG, g_pickB);

        /* Copy hex to clipboard */
        if (OpenClipboard(NULL)) {
            EmptyClipboard();
            int slen = (int)strlen(hex) + 1;
            HGLOBAL hMem = GlobalAlloc(GMEM_MOVEABLE, slen);
            if (hMem) {
                char *p = (char *)GlobalLock(hMem);
                memcpy(p, hex, slen);
                GlobalUnlock(hMem);
                SetClipboardData(CF_TEXT, hMem);
            }
            CloseClipboard();
        }

        len = snprintf(buf, sizeof(buf),
            "{\"type\":\"background\","
            "\"hud\":\"Copied %s\","
            "\"close\":false,"
            "\"notification\":{\"title\":\"Color\",\"body\":\"%s — rgb(%d,%d,%d)\"}}\n",
            hex, hex, g_pickR, g_pickG, g_pickB);
    }

    DWORD written;
    WriteFile(hStdout, buf, (DWORD)len, &written, NULL);
}
