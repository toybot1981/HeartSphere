package com.heartsphere.controller;

import com.heartsphere.dto.AuthResponse;
import com.heartsphere.entity.User;
import com.heartsphere.repository.UserRepository;
import com.heartsphere.utils.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/wechat")
public class WeChatController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${wechat.app-id}")
    private String wechatAppId;

    @Value("${wechat.app-secret}")
    private String wechatAppSecret;

    @PostMapping("/login")
    public ResponseEntity<?> wechatLogin(@RequestBody Map<String, String> request) {
        String code = request.get("code");
        if (code == null || code.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: Code is required!");
        }

        // 调用微信API获取openid
        String url = String.format("https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
                wechatAppId, wechatAppSecret, code);

        RestTemplate restTemplate = new RestTemplate();
        Map<String, Object> response = restTemplate.getForObject(url, Map.class);

        if (response == null || response.containsKey("errcode")) {
            return ResponseEntity.badRequest().body("Error: WeChat authentication failed!");
        }

        String openid = (String) response.get("openid");
        String unionid = (String) response.get("unionid");

        // 查找或创建用户
        User user = userRepository.findByWechatOpenid(openid)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setWechatOpenid(openid);
                    newUser.setUsername("wx_" + openid.substring(0, 10));
                    newUser.setEmail(openid + "@wechat.com");
                    newUser.setPassword(passwordEncoder.encode(openid));
                    newUser.setNickname("微信用户");
                    return userRepository.save(newUser);
                });

        // 生成JWT令牌
        String jwt = jwtUtils.generateJwtTokenFromUsername(user.getUsername());

        return ResponseEntity.ok(new AuthResponse(jwt, user.getId(), user.getUsername(), user.getEmail(), user.getNickname(), user.getAvatar()));
    }

    @GetMapping("/appid")
    public ResponseEntity<?> getWechatAppId() {
        Map<String, String> response = new HashMap<>();
        response.put("appid", wechatAppId);
        return ResponseEntity.ok(response);
    }
}