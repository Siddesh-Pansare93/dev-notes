# CI/CD - Continuous Integration & Deployment

Chalo ek scene imagine karo. Tum Zomato ke backend team mein ho, aur ek feature fix kiya — "restaurant closed" wala bug. Ab agar purane zamane ki tarah manually karna pade to kya hoga? Code likho, apne laptop pe test karo ("mere machine pe to chal raha hai bhai"), phir kisi server pe SSH maar ke manually files copy karo, service restart karo, dua karo ki kuch toota na ho. Aur yeh sab tab jab 50 developers roz alag-alag features push kar rahe hain. Chaos guaranteed hai.

Yehi problem solve karne ke liye CI/CD aaya — ek automated pipeline jo code likhte hi test karta hai, build karta hai, aur production tak safely pahuncha deta hai, bina kisi insaan ko manually button dabaye. Is section mein hum **GitHub Actions** use karke yeh poora automated pipeline banana seekhenge.

## Kya hota hai CI aur CD?

**CI (Continuous Integration)** — jab bhi koi developer code push kare, automatically uska code build ho, tests chalen, aur pata chal jaye ki kuch tuta to nahi. Socho IRCTC ki tarah — jab lakhon log tatkal ticket book kar rahe hote hain, system ko pata hona chahiye real-time mein kuch fail ho raha hai ya nahi, wait nahi karna ki din ke end mein manually check kare.

**CD (Continuous Delivery/Deployment)** — CI ke baad, agar sab tests pass ho gaye, to code automatically staging ya production mein deploy ho jaye. **Continuous Delivery** ka matlab hai deployment ready hai but ek insaan final "go" button dabata hai. **Continuous Deployment** ka matlab hai bilkul zero manual intervention — code merge hote hi seedha production mein live.

> [!tip]
> Yaad rakhne ka tarika: CI = "kya mera code sahi hai?" ka automated jawab. CD = "ab is sahi code ko duniya tak automatically pahunchao."

## Topics Covered

Is section mein hum step-by-step yeh sab cover karenge:

1. **CI/CD Concepts** — CI vs CD ka fark, pipeline ka matlab, aur automated testing kyun zaruri hai. Yeh foundation hai — jaise Ola driver ko pehle traffic rules samajhna padta hai, phir gaadi chalani aati hai.

2. **GitHub Actions Basics** — Workflows, jobs, steps, aur triggers. GitHub Actions ek YAML-based automation tool hai jo GitHub repo ke andar hi chalta hai. Ek `.github/workflows/ci.yml` file banao, aur bas — har push ya PR pe automatically pipeline trigger ho jayega. Example dekho kaisa dikhta hai basic workflow:

   ```yaml
   name: CI Pipeline
   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]

   jobs:
     build-and-test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Setup Node
           uses: actions/setup-node@v4
           with:
             node-version: '20'
         - run: npm install
         - run: npm test
   ```

   Yahan `on` batata hai kab trigger hoga (push ya PR), `jobs` ke andar `steps` sequentially chalte hain — ekdum Swiggy order ke jaise: order place hua → restaurant ne accept kiya → food banaya → delivery boy nikla → order deliver hua. Har step pichle step pe depend karta hai.

3. **Building & Testing** — Automated builds, test runners, aur code quality checks (linting, formatting). Idea yeh hai ki har commit pe automatically `npm run build`, `npm test`, `eslint` jaisi cheezein chal jayein, taaki koi buggy code accidentally main branch mein na aa jaye. Socho isko quality control ki tarah — jaise BigBasket warehouse mein har fruit crate ka quality check hota hai delivery se pehle, waise hi har code "crate" ka check hota hai merge se pehle.

4. **Docker Image CI/CD** — Build, tag, aur push karna Docker images ko registries (Docker Hub, AWS ECR) mein. Yeh 01_fundamentals ke Docker concepts ka direct extension hai. Pipeline mein ek step add hota hai jo `docker build`, phir version ke saath `docker tag` (jaise `myapp:v1.2.3`), aur phir `docker push` registry pe. Isse deployment consistent rehta hai — jo image test mein chali, wahi image production mein bhi chalegi, koi "works on my machine" wala drama nahi.

5. **Deployment Strategies** — Blue-green, canary, aur rolling deployments. Yeh samajhna zaruri hai ki naya code production mein kaise safely rollout kare bina users ko disturb kiye:
   - **Blue-Green**: Do identical environments — "Blue" (live) aur "Green" (naya version). Traffic ek jhatke mein switch ho jata hai Green pe. Agar kuch galat hua, turant wapas Blue pe switch — jaise CRED apna naya app version ek parallel server pe deploy karke traffic switch kare.
   - **Canary**: Naye version ko pehle sirf 5% users ko dikhao (jaise Flipkart kisi naye checkout flow ko sirf kuch users pe test karta hai), agar sab thik raha to gradually 100% tak badhao.
   - **Rolling**: Servers ko ek-ek karke update karo, kabhi bhi poora system down nahi hota — jaise railway station pe ek platform band karke maintenance karo, baaki platforms chalte rahein.

6. **Secrets Management** — GitHub Secrets, environment variables, aur security best practices. Kabhi bhi API keys, database passwords, ya AWS credentials seedha code mein hardcode mat karo — yeh sabse common security mistake hai. GitHub Secrets mein encrypted store karo aur workflow mein reference karo:

   ```yaml
   - name: Deploy to server
     env:
       DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
       AWS_ACCESS_KEY: ${{ secrets.AWS_ACCESS_KEY }}
     run: ./deploy.sh
   ```

   > [!warning]
   > Secrets ko kabhi bhi `console.log` ya `echo` mat karo workflow logs mein — accidentally leak ho sakta hai. GitHub Actions kuch cheezein auto-mask karta hai, lekin best practice yehi hai ki secrets ko kabhi print hi mat karo.

7. **Advanced Workflows** — Matrix builds, reusable workflows, aur caching. **Matrix builds** ka matlab hai ek hi workflow ko multiple versions/OS pe parallel run karna (jaise Node 18, 20, 22 teeno pe test karna ek saath). **Reusable workflows** ka matlab hai common logic ko ek jagah likhna aur multiple repos/pipelines mein reuse karna — DRY principle jaise. **Caching** se `npm install` jaisi slow steps ko speed up karte hain — dependencies ko baar baar download nahi karna padta, jaise Zomato apne popular restaurants ka menu cache karke rakhta hai taaki har baar database query na maarni pade.

## Prerequisites

- GitHub account
- Basic Git knowledge (commit, push, branch, PR ka pata ho)
- Docker ki understanding (pehle `01_fundamentals` complete karo)

## What You'll Build

Is section ke end tak, tum yeh sab kar paoge:

- GitHub Actions ke saath khud ke CI/CD pipelines banana
- Automated testing aur code quality checks setup karna
- Docker images automatically build aur push karna
- Applications ko different environments (staging, production) mein automatically deploy karna

> [!info]
> Agar tumne kabhi socha hai "yeh production deployment itna scary kyun lagta hai" — CI/CD isi fear ko kam karta hai. Jab har change automatically tested aur validated hota hai, deployment ek non-event ban jata hai, drama nahi.

## Key Takeaways

- **CI** matlab har code change automatically build aur test hota hai; **CD** matlab tested code automatically deploy hota hai.
- GitHub Actions ek YAML-based tool hai jisme `workflows` → `jobs` → `steps` ka hierarchy hota hai, aur `on` trigger define karta hai kab chalna hai.
- Docker images ko build-tag-push karke consistent deployments milte hain — jo test hua wahi production mein jaata hai.
- Deployment strategies (blue-green, canary, rolling) risk kam karti hain jab naya code live jata hai.
- Secrets ko kabhi hardcode mat karo — GitHub Secrets ya environment variables use karo, aur logs mein print hone se bachao.
- Matrix builds, reusable workflows, aur caching se pipelines fast aur maintainable bante hain.

**Previous Section**: [← Fundamentals](../01_fundamentals/)  
**Next Section**: [AWS Essentials](../03_aws_essentials/) →
