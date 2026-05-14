⚠️ These actions are **irreversible**, so make sure you're not deleting anything important.

To **remove all unused Docker containers, images, volumes, and networks**, you can use Docker’s built-in **prune**
commands.

---

## 🧹 Full Cleanup: Remove Everything Not in Use

### 🧼 1. **Remove stopped containers, unused networks, dangling images, and build cache**

```
docker system prune -a
```

* `-a`: also removes **unused images**, not just dangling ones.
* You'll be prompted to confirm.

**If you want to auto-confirm:**

```
docker system prune -a -f
```

---

## 🔍 What This Removes

| Item                   | Removed?             |
|------------------------|----------------------|
| **Stopped containers** | ✅                    |
| **Dangling images**    | ✅                    |
| **Unused images**      | ✅ (with `-a`)        |
| **Dangling volumes**   | ❌ *(not by default)* |
| **Build cache**        | ✅                    |
| **Unused networks**    | ✅                    |

---

## 💥 Ultimate One-Liner (Careful!)

```
docker system prune -a --volumes -f
```

---

