export const authController = {
  async getMe(req, res) {
    res.json({
      success: true,
      data: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        avatarUrl: req.user.avatarUrl,
        role: req.user.role,
      },
    });
  },
};
