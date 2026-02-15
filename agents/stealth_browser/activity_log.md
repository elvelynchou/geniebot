2026-02-04 16:51:19,943 - INFO - Using existing profile: scout
2026-02-04 16:51:19,952 - INFO - Attempting to acquire lock for profile 'scout'...
2026-02-04 16:51:19,952 - INFO - Lock acquired.
2026-02-04 16:51:19,954 - INFO - starting
	executable :/bin/google-chrome

arguments:
--remote-allow-origins=*
	--no-first-run
	--no-service-autorun
	--no-default-browser-check
	--homepage=about:blank
	--no-pings
	--password-store=basic
	--disable-infobars
	--disable-breakpad
	--disable-dev-shm-usage
	--disable-session-crashed-bubble
	--disable-search-engine-choice-screen
	--user-data-dir=/etc/myapp/orcher/stealth_browser/profiles/scout
	--disable-session-crashed-bubble
	--disable-features=IsolateOrigins,site-per-process
	--no-sandbox
	--disable-setuid-sandbox
	--disable-blink-features=AutomationControlled
	--test-type
	--disable-notifications
	--window-size=1280,720
	--remote-debugging-host=127.0.0.1
	--remote-debugging-port=59979
2026-02-04 16:51:20,759 - INFO - enabling autodiscover targets
2026-02-04 16:51:20,774 - ERROR - Execution failed: 'str' object has no attribute 'get'
{"status": "error", "message": "'str' object has no attribute 'get'", "data": {"code": 1, "payload": {}}}
2026-02-04 16:51:20,774 - INFO - terminated browser with pid 68214 successfully
2026-02-04 16:51:20,775 - INFO - Lock released.
2026-02-04 16:51:20,781 - INFO - terminated browser with pid 68214 successfully
Exception ignored in: <function BaseSubprocessTransport.__del__ at 0x7fe57693cfe0>
Traceback (most recent call last):
  File "/usr/lib/python3.12/asyncio/base_subprocess.py", line 126, in __del__
    self.close()
  File "/usr/lib/python3.12/asyncio/base_subprocess.py", line 104, in close
    proto.pipe.close()
  File "/usr/lib/python3.12/asyncio/unix_events.py", line 568, in close
    self._close(None)
  File "/usr/lib/python3.12/asyncio/unix_events.py", line 592, in _close
    self._loop.call_soon(self._call_connection_lost, exc)
  File "/usr/lib/python3.12/asyncio/base_events.py", line 795, in call_soon
    self._check_closed()
  File "/usr/lib/python3.12/asyncio/base_events.py", line 541, in _check_closed
    raise RuntimeError('Event loop is closed')
RuntimeError: Event loop is closed
| 2026-02-04 17:23:51 | lab_generator | FAIL | Element with text 'Download 1K' not found |
| 2026-02-04 17:24:24 | lab_generator | FAIL | Element not found: img[alt*='Flow Image'] |
| 2026-02-04 18:13:08 | lab_generator | FAIL | Element with text 'Download 1K' not found |
| 2026-02-04 18:13:41 | lab_generator | FAIL | Element not found: img[alt*='Flow Image'] |
| 2026-02-06 01:44:02 | lab_generator | FAIL | Element with text 'Download 1K' not found |
| 2026-02-06 01:44:35 | lab_generator | FAIL | Element not found: img[alt*='Flow Image'] |
| 2026-02-06 13:21:47 | lab_generator | FAIL | No '[role='menuitem']' with text 'Download 1K' |
| 2026-02-06 13:26:17 | lab_generator | FAIL | No '[role='menuitem']' with text 'Download 1K' |
| 2026-02-06 13:35:18 | lab_generator | FAIL | No '[role='menuitem']' with text 'Download 1K' |
| 2026-02-07 01:19:59 | lab_generator | FAIL | No '[role='menuitem']' with text 'Download 1K' |
| 2026-02-07 01:20:32 | lab_generator | FAIL | Element not found: img[alt*='Flow Image'] |
| 2026-02-08 01:07:17 | lab_generator | FAIL | No '[role='menuitem']' with text 'Download 1K' |
| 2026-02-08 01:07:50 | lab_generator | FAIL | Element not found: img[alt*='Flow Image'] |
| 2026-02-09 01:11:12 | lab_generator | FAIL | No '[role='menuitem']' with text 'Download 1K' |
| 2026-02-09 01:11:45 | lab_generator | FAIL | Element not found: img[alt*='Flow Image'] |
| 2026-02-10 07:24:51 | lab_generator | FAIL | No 'button[type='submit']' with text 'Generate' |
| 2026-02-10 07:29:52 | lab_generator | FAIL | No 'button[type='submit']' with text 'Generate' |
| 2026-02-10 07:30:17 | lab_generator | FAIL | No 'button' with text 'Download' |
| 2026-02-10 07:53:09 | lab_generator | FAIL | No 'div[role='menuitem']' with text 'Download 1K' |
| 2026-02-10 07:56:14 | lab_generator | FAIL | No '*[role='menuitem']' with text 'Download' |
| 2026-02-10 07:59:19 | lab_generator | FAIL | Element not found: *[role='menuitem'] |
| 2026-02-10 08:02:33 | lab_generator | FAIL | Element not found: *[role='menuitem'] |
| 2026-02-10 08:50:10 | lab_generator | FAIL | No 'div[role='option']' with text 'Create Image' |
| 2026-02-10 08:52:18 | lab_generator | FAIL | No 'div[role='menuitem']' with text 'Download 1K' |
| 2026-02-10 08:53:24 | lab_generator | FAIL | Element not found: button[aria-haspopup='menu'] |
| 2026-02-10 08:53:37 | lab_generator | FAIL | Element with text 'Download 1K' not found |
| 2026-02-10 09:06:34 | lab_generator | FAIL | No 'div[role='option']' with text 'Create Image' |
| 2026-02-10 09:08:40 | lab_generator | FAIL | No 'div[role='menu'][data-state='open'] div[role='menuitem']' with text 'Download 1K' |
| 2026-02-10 09:29:53 | lab_generator | FAIL | No 'div[role='option']' with text 'Create Image' |
| 2026-02-10 09:32:17 | lab_generator | FAIL | No 'div[role='menuitem']' with text 'Download 1K' |
| 2026-02-10 09:39:34 | lab_generator | FAIL | Type action requires selector or text_match |
| 2026-02-10 09:51:54 | lab_generator | FAIL | No '[role='option']' with text 'Create Image' |
| 2026-02-10 11:26:36 | lab_generator | FAIL | No '[role='option']' with text 'Create Image' |
| 2026-02-10 11:31:41 | lab_generator | FAIL | No '[role='option']' with text 'Create Image' |
| 2026-02-10 11:40:04 | lab_generator | FAIL | No '[role='option']' with text 'Create Image' |
| 2026-02-10 11:45:51 | lab_generator | FAIL | No '[role='option']' with text 'Create Image' |
| 2026-02-10 12:22:10 | lab_generator | FAIL | No '[role='option']' with text 'Create Image' |
| 2026-02-10 12:32:06 | lab_generator | FAIL | No '[role='option']' with text 'Create Image' |
| 2026-02-10 12:37:05 | lab_generator | FAIL | No '[role='option']' with text 'Create Image' |
