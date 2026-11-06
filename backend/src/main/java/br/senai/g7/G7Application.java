package br.senai.g7;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Ponto de entrada da aplicação Spring Boot. Habilita o agendamento (@EnableScheduling) usado pela
 * rotina de inadimplência.
 */
@SpringBootApplication
@EnableScheduling
public class G7Application {
    public static void main(String[] args) {
        SpringApplication.run(G7Application.class, args);
    }
}
