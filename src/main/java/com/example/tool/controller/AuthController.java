package com.example.tool.controller;

import com.example.tool.dto.AuthResponse;
import com.example.tool.dto.LoginRequest;
import com.example.tool.dto.RegisterRequest;
import com.example.tool.entity.User;
import com.example.tool.repository.UserRepository;
import com.example.tool.config.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        System.out.println("Registration request received for email: " + request.getEmail());
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            System.out.println("Registration failed: Email already in use");
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Email already in use"));
        }
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole("VIEWER");
        userRepository.save(user);
        System.out.println("User registered successfully: " + user.getEmail());
        return ResponseEntity.ok(java.util.Map.of("message", "User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        System.out.println("Login request received for email: " + request.getEmail());
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
            System.out.println("Login failed: Invalid email or password");
            return ResponseEntity.status(401).body(java.util.Map.of("message", "Invalid email or password"));
        }
        
        User user = userOpt.get();
        String token = jwtUtil.generateToken(user.getEmail());
        AuthResponse.UserDto userDto = new AuthResponse.UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole());
        
        System.out.println("Login successful for user: " + user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, userDto));
    }
}

