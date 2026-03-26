package com.terranode.controller;

import com.terranode.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

record RequestOtpPayload(String email) {}
record VerifyOtpPayload(String email, String otp) {}
record AuthMessageResponse(String message) {}
record AuthTokenResponse(String token) {}

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/request-otp")
    public ResponseEntity<AuthMessageResponse> requestOtp(@RequestBody RequestOtpPayload request) {
        try {
            String baseSafeResponse = authService.requestOtp(request.email());
            return ResponseEntity.ok(new AuthMessageResponse(baseSafeResponse));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new AuthMessageResponse(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new AuthMessageResponse(e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody VerifyOtpPayload request) {
        try {
            String token = authService.verifyOtpAndLogin(
                    request.email(),
                    request.otp()
            );
            return ResponseEntity.ok(new AuthTokenResponse(token));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new AuthMessageResponse(e.getMessage()));
        }
    }
}
