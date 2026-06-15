-- Rebrand all transactional email templates commit.show → Legit.Show.
--
-- These are the auth + welcome emails rendered by the auth-email-hook /
-- send-email functions (email_templates table, keyed by `kind`). Every one was
-- commit.show-branded — navy/gold palette, "every commit, on stage", the
-- retired vibe-coding league copy, npx commitshow CLI, /submit · /ladder links.
-- Rewritten to Legit.Show: amber/cream palette, Fraunces, directory framing,
-- legit.show links. Variables ({{display_name}}, {{confirmation_url}}) unchanged.
--
-- NOTE: the email *sender* (From: notifications@commit.show) is the EMAIL_FROM
-- secret + Resend domain verification — a separate infra step (see the
-- edge-function default change + ops note). This migration fixes the content.

-- ── auth_signup_confirmation ──
update email_templates set
  subject = 'Confirm your Legit.Show signup',
  html_body = $h$<!doctype html>
<html><body style="margin:0;padding:0;background:#FBF7EF;font-family:Inter,system-ui,sans-serif;color:#211C15;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7EF;">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #ECE3D2;border-radius:14px;">
        <tr><td style="padding:40px 40px 32px;">
          <div style="font-family:Fraunces,Georgia,serif;font-size:24px;font-weight:700;color:#8A5A12;letter-spacing:-0.5px;">Legit<span style="color:#B5791C;">.Show</span></div>
          <div style="font-size:11px;color:#9A9080;letter-spacing:2px;text-transform:uppercase;margin-top:4px;font-family:monospace;">Every launched service, tested</div>
          <h1 style="font-family:Fraunces,Georgia,serif;font-size:32px;color:#211C15;margin:30px 0 14px;letter-spacing:-0.5px;">Confirm your signup</h1>
          <p style="font-size:16px;line-height:1.6;color:#4A4438;margin:0 0 24px;">Hi {{display_name}}, confirm your email to start using Legit.Show — the directory of launched web apps, SaaS, AI tools and MCP servers, each with an objective production-readiness benchmark.</p>
          <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#97600F;">
            <a href="{{confirmation_url}}" style="display:inline-block;padding:14px 28px;font-family:Inter,system-ui,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.3px;color:#FFFFFF;text-decoration:none;">Confirm email</a>
          </td></tr></table>
          <p style="font-size:13px;line-height:1.6;color:#6F6757;margin:24px 0 0;">Or copy this link:<br><a href="{{confirmation_url}}" style="color:#97600F;text-decoration:underline;word-break:break-all;">{{confirmation_url}}</a></p>
          <p style="font-size:12px;color:#9A9080;margin:32px 0 0;border-top:1px solid #F1E9D8;padding-top:16px;">If you didn't sign up for Legit.Show, you can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>$h$,
  text_body = $t$Legit.Show — confirm your signup

Hi {{display_name}},

Confirm your email to activate your account:
{{confirmation_url}}

If you didn't sign up, ignore this email.$t$
where kind = 'auth_signup_confirmation';

-- ── auth_magic_link ──
update email_templates set
  subject = 'Sign in to Legit.Show',
  html_body = $h$<!doctype html>
<html><body style="margin:0;padding:0;background:#FBF7EF;font-family:Inter,system-ui,sans-serif;color:#211C15;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7EF;">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #ECE3D2;border-radius:14px;">
        <tr><td style="padding:40px 40px 32px;">
          <div style="font-family:Fraunces,Georgia,serif;font-size:24px;font-weight:700;color:#8A5A12;letter-spacing:-0.5px;">Legit<span style="color:#B5791C;">.Show</span></div>
          <div style="font-size:11px;color:#9A9080;letter-spacing:2px;text-transform:uppercase;margin-top:4px;font-family:monospace;">Every launched service, tested</div>
          <h1 style="font-family:Fraunces,Georgia,serif;font-size:32px;color:#211C15;margin:30px 0 14px;letter-spacing:-0.5px;">Your sign-in link</h1>
          <p style="font-size:16px;line-height:1.6;color:#4A4438;margin:0 0 24px;">Hi {{display_name}}, click below to sign in to Legit.Show. Single-use &middot; expires in an hour.</p>
          <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#97600F;">
            <a href="{{confirmation_url}}" style="display:inline-block;padding:14px 28px;font-family:Inter,system-ui,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.3px;color:#FFFFFF;text-decoration:none;">Sign in</a>
          </td></tr></table>
          <p style="font-size:13px;line-height:1.6;color:#6F6757;margin:24px 0 0;">Or copy this link:<br><a href="{{confirmation_url}}" style="color:#97600F;text-decoration:underline;word-break:break-all;">{{confirmation_url}}</a></p>
          <p style="font-size:12px;color:#9A9080;margin:32px 0 0;border-top:1px solid #F1E9D8;padding-top:16px;">If you didn't request this, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>$h$,
  text_body = $t$Legit.Show — your sign-in link

Hi {{display_name}}, click to sign in (single-use, expires in an hour):
{{confirmation_url}}

If you didn't request this, ignore this email.$t$
where kind = 'auth_magic_link';

-- ── auth_recovery ──
update email_templates set
  subject = 'Reset your Legit.Show password',
  html_body = $h$<!doctype html>
<html><body style="margin:0;padding:0;background:#FBF7EF;font-family:Inter,system-ui,sans-serif;color:#211C15;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7EF;">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #ECE3D2;border-radius:14px;">
        <tr><td style="padding:40px 40px 32px;">
          <div style="font-family:Fraunces,Georgia,serif;font-size:24px;font-weight:700;color:#8A5A12;letter-spacing:-0.5px;">Legit<span style="color:#B5791C;">.Show</span></div>
          <div style="font-size:11px;color:#9A9080;letter-spacing:2px;text-transform:uppercase;margin-top:4px;font-family:monospace;">Every launched service, tested</div>
          <h1 style="font-family:Fraunces,Georgia,serif;font-size:32px;color:#211C15;margin:30px 0 14px;letter-spacing:-0.5px;">Reset your password</h1>
          <p style="font-size:16px;line-height:1.6;color:#4A4438;margin:0 0 24px;">Hi {{display_name}}, click below to set a new password for your Legit.Show account.</p>
          <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#97600F;">
            <a href="{{confirmation_url}}" style="display:inline-block;padding:14px 28px;font-family:Inter,system-ui,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.3px;color:#FFFFFF;text-decoration:none;">Reset password</a>
          </td></tr></table>
          <p style="font-size:13px;line-height:1.6;color:#6F6757;margin:24px 0 0;">Or copy this link:<br><a href="{{confirmation_url}}" style="color:#97600F;text-decoration:underline;word-break:break-all;">{{confirmation_url}}</a></p>
          <p style="font-size:12px;color:#9A9080;margin:32px 0 0;border-top:1px solid #F1E9D8;padding-top:16px;">If you didn't ask to reset your password, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>$h$,
  text_body = $t$Legit.Show — reset your password

Hi {{display_name}}, set a new password:
{{confirmation_url}}

If you didn't ask for this, ignore this email.$t$
where kind = 'auth_recovery';

-- ── auth_invite ──
update email_templates set
  subject = 'You''re invited to Legit.Show',
  html_body = $h$<!doctype html>
<html><body style="margin:0;padding:0;background:#FBF7EF;font-family:Inter,system-ui,sans-serif;color:#211C15;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7EF;">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #ECE3D2;border-radius:14px;">
        <tr><td style="padding:40px 40px 32px;">
          <div style="font-family:Fraunces,Georgia,serif;font-size:24px;font-weight:700;color:#8A5A12;letter-spacing:-0.5px;">Legit<span style="color:#B5791C;">.Show</span></div>
          <div style="font-size:11px;color:#9A9080;letter-spacing:2px;text-transform:uppercase;margin-top:4px;font-family:monospace;">Every launched service, tested</div>
          <h1 style="font-family:Fraunces,Georgia,serif;font-size:32px;color:#211C15;margin:30px 0 14px;letter-spacing:-0.5px;">You're invited</h1>
          <p style="font-size:16px;line-height:1.6;color:#4A4438;margin:0 0 24px;">Hi {{display_name}}, you've been invited to Legit.Show — the directory of launched web apps, SaaS, AI tools and MCP servers, each with an objective production-readiness benchmark. Accept below to get started.</p>
          <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#97600F;">
            <a href="{{confirmation_url}}" style="display:inline-block;padding:14px 28px;font-family:Inter,system-ui,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.3px;color:#FFFFFF;text-decoration:none;">Accept invite</a>
          </td></tr></table>
          <p style="font-size:13px;line-height:1.6;color:#6F6757;margin:24px 0 0;">Or copy this link:<br><a href="{{confirmation_url}}" style="color:#97600F;text-decoration:underline;word-break:break-all;">{{confirmation_url}}</a></p>
          <p style="font-size:12px;color:#9A9080;margin:32px 0 0;border-top:1px solid #F1E9D8;padding-top:16px;">If you weren't expecting this invite, you can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>$h$,
  text_body = $t$Legit.Show — you're invited

Hi {{display_name}}, accept your invite:
{{confirmation_url}}$t$
where kind = 'auth_invite';

-- ── auth_email_change ──
update email_templates set
  subject = 'Confirm your new Legit.Show email',
  html_body = $h$<!doctype html>
<html><body style="margin:0;padding:0;background:#FBF7EF;font-family:Inter,system-ui,sans-serif;color:#211C15;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7EF;">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #ECE3D2;border-radius:14px;">
        <tr><td style="padding:40px 40px 32px;">
          <div style="font-family:Fraunces,Georgia,serif;font-size:24px;font-weight:700;color:#8A5A12;letter-spacing:-0.5px;">Legit<span style="color:#B5791C;">.Show</span></div>
          <div style="font-size:11px;color:#9A9080;letter-spacing:2px;text-transform:uppercase;margin-top:4px;font-family:monospace;">Every launched service, tested</div>
          <h1 style="font-family:Fraunces,Georgia,serif;font-size:32px;color:#211C15;margin:30px 0 14px;letter-spacing:-0.5px;">Confirm your new email</h1>
          <p style="font-size:16px;line-height:1.6;color:#4A4438;margin:0 0 24px;">Hi {{display_name}}, confirm this is your new email address for your Legit.Show account.</p>
          <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#97600F;">
            <a href="{{confirmation_url}}" style="display:inline-block;padding:14px 28px;font-family:Inter,system-ui,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.3px;color:#FFFFFF;text-decoration:none;">Confirm new email</a>
          </td></tr></table>
          <p style="font-size:13px;line-height:1.6;color:#6F6757;margin:24px 0 0;">Or copy this link:<br><a href="{{confirmation_url}}" style="color:#97600F;text-decoration:underline;word-break:break-all;">{{confirmation_url}}</a></p>
          <p style="font-size:12px;color:#9A9080;margin:32px 0 0;border-top:1px solid #F1E9D8;padding-top:16px;">If you didn't request an email change, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>$h$,
  text_body = $t$Legit.Show — confirm your new email

Hi {{display_name}}, confirm your new email address:
{{confirmation_url}}

If you didn't request this, ignore this email.$t$
where kind = 'auth_email_change';

-- ── welcome (full rewrite — drop league/CLI, directory framing) ──
update email_templates set
  subject = 'Welcome to Legit.Show',
  html_body = $h$<div style="font-family:Inter,system-ui,sans-serif;color:#211C15;max-width:560px;margin:0 auto;padding:24px">
  <p style="font-size:12px;letter-spacing:2px;color:#9A9080;margin:0 0 4px;font-family:monospace;text-transform:uppercase">Legit.Show</p>
  <h1 style="font-family:Fraunces,Georgia,serif;font-size:28px;font-weight:700;line-height:1.15;margin:0 0 16px">Welcome, {{display_name}}.</h1>
  <p style="font-size:15px;line-height:1.6;color:#4A4438;margin:0 0 14px">You just joined Legit.Show — a directory of launched web apps, SaaS, AI tools and MCP servers, each with an objective production-readiness benchmark.</p>
  <p style="font-size:15px;line-height:1.6;color:#4A4438;margin:0 0 14px">Three things you can do today:</p>
  <ul style="font-size:15px;line-height:1.7;color:#4A4438;margin:0 0 18px;padding-left:22px">
    <li>Browse the directory &middot; <a href="https://legit.show" style="color:#97600F">legit.show</a></li>
    <li>Add your own service &middot; <a href="https://legit.show/about" style="color:#97600F">legit.show/about</a></li>
    <li>Read the data reports &middot; <a href="https://legit.show/reports" style="color:#97600F">legit.show/reports</a></li>
  </ul>
  <p style="font-size:13px;line-height:1.55;color:#6F6757;margin:24px 0 0;border-top:1px solid #F1E9D8;padding-top:16px">You're receiving this because you signed up at legit.show. Reply to this email if you have any questions — a real human reads them.</p>
</div>$h$,
  text_body = $t$Welcome to Legit.Show, {{display_name}}.

You just joined a directory of launched web apps, SaaS, AI tools and MCP servers — each with an objective production-readiness benchmark.

- Browse the directory: https://legit.show
- Add your own service: https://legit.show/about
- Read the data reports: https://legit.show/reports

You're receiving this because you signed up at legit.show. Reply with any questions — a real human reads them.$t$
where kind = 'welcome';
